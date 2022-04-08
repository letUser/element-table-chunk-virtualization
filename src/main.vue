<template>
    <div class="virt-el-table">
        <infinite-loading
            slot="append"
            direction="top"
            :identifier="infiniteId + 2"
            @infinite="infiniteHandlerTop"
            force-use-infinite-wrapper=".el-table__body-wrapper"
            ref="infiniteLoadingTop"
            spinner="none"
            :distance="1"
        >
            <span slot="spinner"></span>
            <template slot="no-more">
                <span />
            </template>
            <template slot="no-results">
                <span />
            </template>
        </infinite-loading>

        <el-table v-bind="$attrs" ref="table" />

        <infinite-loading
            slot="append"
            :identifier="infiniteId"
            @infinite="infiniteHandlerBttm"
            force-use-infinite-wrapper=".el-table__body-wrapper"
            ref="infiniteLoadingBttm"
            spinner="spiral"
            :distance="1"
        >
            <template slot="no-more">
                <span />
            </template>
            <template slot="no-results">
                <span />
            </template>
        </infinite-loading>
    </div>
</template>

<script>
export default {
    name: 'virt-el-table',
    data: () => ({
        infiniteId: +new Date(),
        virt: {
            data: [],
            chunks: null,
            chunkSize: 0,
            chunkIndex: {
                dir: 'top',
                index: 0
            },
            chunkDisplay: []
        }
    }),
    methods: {
        /* prepare data for virtualization */
        prepareVirtualization (force = true) {
            if (this.useVirtualization) {
                if (!this.virt?.chunks?.length || force) {
                    const chunkSize = 20
                    const chunks = []

                    /* split array into chunks */
                    for (let i = 0; i < Math.ceil(this.data.length / chunkSize); i++) {
                        chunks[i] = this.data.slice((i * chunkSize), (i * chunkSize) + chunkSize)
                    }

                    console.log(chunks)

                    this.virt = {
                        chunkSize,
                        chunks,
                        data: [],
                        chunkIndex: {
                            dir: 'top',
                            index: 0
                        },
                        chunkDisplay: []
                    }

                    this.infiniteId++
                }
            }
        },

        /* scroll DOWN event handler */
        infiniteHandlerBttm ($state) {
            /* interceptor to set index value, after changing scroll direction */
            const index =
                this.virt.chunkIndex.dir === 'top' &&
                (this.virt.chunkIndex.index > 2 ||
                    this.virt.chunkIndex.index < 0)
                    ? this.virt.chunkDisplay?.slice(-1) + 1
                    : this.virt.chunkIndex.index

            /* chunk availability check */
            if (
                !this.virt.chunks[index].length ||
                (this.searching &&
                    index > this.searchedData?.length / this.virt.chunkSize)
            ) {
                $state.complete()
            } else {
                /* every n10 chunk check */
                if (index !== 0 && index % 10 === 0) {
                    this.virt.data.splice(0, this.virt.chunkSize * 10) // remove 10 previous chunks from data
                    this.virt.chunkDisplay.splice(0, 10) // remove chunk indexes from UI list
                    this.$refs.infiniteLoadingBttm.scrollParent.scrollTop = 10 // set scroll position
                    this.$refs.infiniteLoadingTop.stateChanger.reset() // refresh scroll UP event handler
                }

                /* adding selected lines */
                if (this.selectedAll) {
                    this.$refs.table.selection.push(...this.virt.chunks[index])
                }

                /* check if index does't exist in the list of displayed chunks */
                if (
                    index &&
                    !this.virt.chunkDisplay.find((item) => item === index)
                ) {
                    this.virt.data.push(...this.virt.chunks[index]) // add chunk to end of data
                    this.virt.chunkDisplay.push(index) // paste chunk index to end of chunk list displayed
                }

                /* update chunk index data for next call of handler */
                this.virt.chunkIndex = {
                    dir: 'bttm',
                    index: index + 1
                }

                $state.loaded()
            }
        },

        /* scroll UP event handler */
        infiniteHandlerTop ($state) {
            /* interceptor to set index value, after changing scroll direction */
            const index =
                this.virt.chunkIndex.dir !== 'top' &&
                this.virt.chunkIndex.index > 2
                    ? this.virt.chunkDisplay[0] - 1
                    : this.virt.chunkIndex.index

            if (this.virt.chunks?.length) {
                /* chunk availability check */
                if (!this.virt.chunks[index].length) {
                    $state.complete()
                } else {
                    /* check this is NOT first launch of handler */
                    if (
                        index > 1 ||
                        (index >= 0 && this.virt.chunkIndex.dir === 'top')
                    ) {
                        /* every n9 chunk check */
                        if (index % 10 === 9) {
                            this.virt.data.splice(0, this.virt.data.length) // remove chunks stack
                            this.virt.chunkDisplay.splice(0, 10) // remove chunk indexes from UI list
                            /* set scroll position */
                            this.$refs.infiniteLoadingTop.scrollParent.scrollTop =
                                this.$refs.infiniteLoadingTop.scrollParent
                                    .offsetHeight * 4.5
                        }

                        /* check if index does't exist in the list of displayed chunks */
                        if (
                            !this.virt.chunkDisplay.find(
                                (item) => item === index
                            )
                        ) {
                            /* add chunk to the beginning of the data */
                            this.virt.data.unshift(
                                ...this.virt.chunks[index < 0 ? 0 : index]
                            )
                            /* paste chunk index to the beginning of chunk list displayed */
                            this.virt.chunkDisplay.unshift(
                                index < 0 ? 0 : index
                            )

                            /* hack to delete repeatable display value of zero chunk,
                               which appears due to double call of handler during table creation */
                            if (
                                this.virt.data?.length ===
                                    this.virt.chunkSize &&
                                this.virt.chunkDisplay[0] ===
                                    this.virt.chunkDisplay[1]
                            ) {
                                this.virt.chunkDisplay.splice(0, 1)
                            }
                        }

                        /* adding selected lines */
                        if (this.selectedAll) {
                            this.$refs.table.selection.unshift(
                                ...this.virt.chunks[index]
                            )
                        }

                        /* update chunk index data for next call of handler */
                        this.virt.chunkIndex = {
                            dir: 'top',
                            index: index - 1
                        }
                    /* IF it is FIRST launch of handler */
                    } else {
                        /* first upload of data into table */
                        this.virt.data.push(...this.virt.chunks[index])

                        /* paste chunk index to end of chunk list displayed */
                        if (
                            !(index <= 0) &&
                            !this.virt.chunkDisplay.find(
                                (item) => item === index
                            )
                        ) {
                            this.virt.chunkDisplay.push(index)
                        }

                        /* update chunk index data for next call of handler */
                        this.virt.chunkIndex = {
                            dir: 'bttm',
                            index: index + 1
                        }
                    }

                    $state.loaded()
                }
            }
        }
    }
}
</script>
