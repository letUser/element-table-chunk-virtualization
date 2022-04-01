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
        /** подготовить данные для виртуализации */
        prepareVirtualization (force = true) {
            if (this.useVirtualization) {
                if (!this.virt?.chunks?.length || force) {
                    const chunkSize = 20
                    const chunks = []

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

        /* обработчик события скролла ВНИЗ */
        infiniteHandlerBttm ($state) {
            // перехватчик, который устанавливает верное значение индекса при смене направления скроллинга
            const index =
                this.virt.chunkIndex.dir === 'top' &&
                (this.virt.chunkIndex.index > 2 ||
                    this.virt.chunkIndex.index < 0)
                    ? this.virt.chunkDisplay?.slice(-1) + 1
                    : this.virt.chunkIndex.index

            // проверка на наличие чанка
            if (
                !this.virt.chunks[index].length ||
                (this.searching &&
                    index > this.searchedData?.length / this.virt.chunkSize)
            ) {
                $state.complete()
            } else {
                // проверка на каждый x10 чанк
                if (index !== 0 && index % 10 === 0) {
                    this.virt.data.splice(0, this.virt.chunkSize * 10) // убираем 10 предыдущих чанков из даты
                    this.virt.chunkDisplay.splice(0, 10) // убираем индексы чанков из списка UI
                    // устанавливаем позицию скролла
                    this.$refs.infiniteLoadingBttm.scrollParent.scrollTop = 10
                    this.$refs.infiniteLoadingTop.stateChanger.reset() // перезагружаем обработчик скроллинга вверх
                }

                // добавяем селекторы
                if (this.selectedAll) {
                    this.$refs.table.selection.push(...this.virt.chunks[index])
                }

                // проверка на отсутствие индекса чанка в списке чанков отображенных в UI
                if (
                    index &&
                    !this.virt.chunkDisplay.find((item) => item === index)
                ) {
                    this.virt.data.push(...this.virt.chunks[index]) // вставляем чанк в конец даты
                    this.virt.chunkDisplay.push(index) // всавляем индекс чанка в конец списка чанков в UI
                }

                // обновляем данные индекса чанка для последующего вызова обработчика
                this.virt.chunkIndex = {
                    dir: 'bttm',
                    index: index + 1
                }

                $state.loaded()
            }
        },

        /* обработчик события скролла ВВЕРХ */
        infiniteHandlerTop ($state) {
            // перехватчик, который устанавливает верное значение индекса при смене направления скроллинга
            const index =
                this.virt.chunkIndex.dir !== 'top' &&
                this.virt.chunkIndex.index > 2
                    ? this.virt.chunkDisplay[0] - 1
                    : this.virt.chunkIndex.index

            if (this.virt.chunks?.length) {
                // проверка на наличие чанка
                if (!this.virt.chunks[index].length) {
                    $state.complete()
                } else {
                    // проверка на НЕ первичный запуск обработчика
                    if (
                        index > 1 ||
                        (index >= 0 && this.virt.chunkIndex.dir === 'top')
                    ) {
                        // проверка на каждый n9 чанк
                        if (index % 10 === 9) {
                            this.virt.data.splice(0, this.virt.data.length) // чистим стэк чанков
                            this.virt.chunkDisplay.splice(0, 10) // чистим список чанков в UI
                            // настраиваем позицию скролла
                            this.$refs.infiniteLoadingTop.scrollParent.scrollTop =
                                this.$refs.infiniteLoadingTop.scrollParent
                                    .offsetHeight * 4.5
                        }

                        // проверка на отсутствие индекса чанка в списке чанков отображенных в UI
                        if (
                            !this.virt.chunkDisplay.find(
                                (item) => item === index
                            )
                        ) {
                            // вставляем чанк в начало даты
                            this.virt.data.unshift(
                                ...this.virt.chunks[index < 0 ? 0 : index]
                            )
                            // вставляем индекс чанка в начало списка чанков в UI
                            this.virt.chunkDisplay.unshift(
                                index < 0 ? 0 : index
                            )

                            // костыль для удаления повторяющегося значения дисплея нулевого чанка,
                            // появляющегося из-за двойного вызова этого обработчика при создании таблицы.
                            if (
                                this.virt.data?.length ===
                                    this.virt.chunkSize &&
                                this.virt.chunkDisplay[0] ===
                                    this.virt.chunkDisplay[1]
                            ) {
                                this.virt.chunkDisplay.splice(0, 1)
                            }
                        }

                        // добавяем селекторы
                        if (this.selectedAll) {
                            this.$refs.table.selection.unshift(
                                ...this.virt.chunks[index]
                            )
                        }

                        // обновляем данные индекса чанка для последующего вызова обработчика
                        this.virt.chunkIndex = {
                            dir: 'top',
                            index: index - 1
                        }
                        // проверка на первичный запуск обработчика
                    } else {
                        // первичная подгрузка данных в таблицу
                        this.virt.data.push(...this.virt.chunks[index])

                        // всавляем индекс чанка в конец списка чанков в UI
                        if (
                            !(index <= 0) &&
                            !this.virt.chunkDisplay.find(
                                (item) => item === index
                            )
                        ) {
                            this.virt.chunkDisplay.push(index)
                        }

                        // обновляем данные индекса чанка для последующего вызова обработчика
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
