<template>
  <div class="container">
    <div class="left-board">
      <div class="logo-wrapper">
        <div class="logo">Pomelo Form Generator</div>
      </div>
      <el-scrollbar class="left-scrollbar">
        <div class="components-list">
          <span>组件列表</span>
          <!--list：需要拖放的元素数组-->
          <!--group：实现拖拽元素的同步-->
          <!--end：拖拽结束之后触发的事件-->
          <draggable
            class="components-draggable"
            :list="supportComponents"
            :group="{ name: 'componentsGroup', pull: 'clone', put: false }"
            :clone="cloneComponent"
            draggable=".components-item"
            :sort="false"
            @end="onEnd"
          >
            <div
              v-for="(component, index) in supportComponents"
              :key="index"
              class="components-item"
              @click="addComponent(component)"
            >
              <div class="components-body">
                <svg-icon :icon-class="component.__config__.tagIcon" />
                {{ component.__config__.label }}
              </div>
            </div>
          </draggable>
        </div>
      </el-scrollbar>
    </div>
    <div class="center-board">
      <div class="action-bar">
        <el-button icon="el-icon-video-play" type="text" @click="run">
          运行
        </el-button>
        <el-button icon="el-icon-view" type="text" @click="showJson">
          查看json
        </el-button>
        <el-button icon="el-icon-download" type="text" @click="download">
          导出vue文件
        </el-button>
        <el-button
          class="copy-btn-main"
          icon="el-icon-document-copy"
          type="text"
          @click="copy"
        >
          复制代码
        </el-button>
        <el-button
          class="delete-btn"
          icon="el-icon-delete"
          type="text"
          @click="empty"
        >
          清空
        </el-button>
      </div>
      <el-scrollbar class="center-scrollbar">
        <el-row class="center-board-row" :gutter="formConfig.gutter">
          <el-form
            :size="formConfig.size"
            :label-position="formConfig.labelPosition"
            :disabled="formConfig.disabled"
            :label-width="`${formConfig.labelWidth}px`"
          >
            <draggable
              class="drawing-board"
              :list="drawingList"
              :animation="340"
              group="componentsGroup"
            >
              <draggable-item
                v-for="(formItem, index) in drawingList"
                :key="formItem.renderKey"
                :drawing-list="drawingList"
                :current-item="formItem"
                :index="index"
                :active-id="activeId"
                :form-conf="formConfig"
                @activeItem="activeFormItem"
                @copyItem="drawingItemCopy"
                @deleteItem="drawingItemDelete"
              />
            </draggable>
            <div v-show="!drawingList.length" class="empty-info">
              从左侧拖入或点选组件进行表单设计
            </div>
          </el-form>
        </el-row>
      </el-scrollbar>
    </div>
    <right-panel
      :active-data="activeData"
      :form-conf="formConfig"
      :show-field="!!drawingList.length"
      @tag-change="tagChange"
      @fetch-data="fetchData"
    />
    <!--    <form-drawer-->
    <!--      :visible.sync="drawerVisible"-->
    <!--      :form-data="formData"-->
    <!--      size="100%"-->
    <!--      :generate-conf="generateConf"-->
    <!--    />-->
    <!--    <json-drawer-->
    <!--      size="60%"-->
    <!--      :visible.sync="jsonDrawerVisible"-->
    <!--      :json-str="JSON.stringify(formData)"-->
    <!--      @refresh="refreshJson"-->
    <!--    />-->
    <!--    <code-type-dialog-->
    <!--      :visible.sync="dialogVisible"-->
    <!--      title="选择生成类型"-->
    <!--      :show-file-name="showFileName"-->
    <!--      @confirm="generate"-->
    <!--    />-->
    <!--    <input id="copyNode" type="hidden" />-->
  </div>
</template>

<script>
import draggable from 'vuedraggable'
import { debounce } from 'throttle-debounce'
import { saveAs } from 'file-saver'
import ClipboardJS from 'clipboard'
import { supportComponents } from '@/config/supportComponents'
import { drawingFormItems } from '@/config/drawingFormItems'
import { formConfig } from '@/config/formConfig'

import FormDrawer from '@/views/FormDrawer.vue'
import JsonDrawer from '@/views/JsonDrawer.vue'
import RightPanel from '@/views/RightPanel.vue'
import ComponentTypeDialog from '@/views/ComponentTypeDialog.vue'
import DraggableItem from '@/views/DraggableItem.vue'

let tempActiveData

export default {
  name: 'HomeView',
  components: {
    draggable,
    FormDrawer,
    JsonDrawer,
    RightPanel,
    ComponentTypeDialog,
    DraggableItem
  },
  data() {
    return {
      supportComponents,
      formConfig,
      drawingList: drawingFormItems,
      activeId: drawingFormItems[0].formId
    }
  },
  methods: {
    fetchData(component) {
      const { dataType, method, url } = component.__config__
      if (dataType === 'dynamic' && method && url) {
        this.setLoading(component, true)
        this.$axios({
          method,
          url
        }).then(resp => {
          this.setLoading(component, false)
          this.setRespData(component, resp.data)
        })
      }
    },
    addComponent(component) {
      const clone = this.cloneComponent(component)
      this.fetchData(clone)
      this.drawingList.push(clone)
      this.activeFormItem(clone)
    },
    // 克隆节点
    cloneComponent(oldTag) {
      const clone = this.$lodash.cloneDeep(oldTag)
      const config = clone.__config__
      config.span = this.formConfig.span // 生成代码时，会根据span做精简判断
      this.createIdAndKey(clone)
      clone.placeholder !== undefined && (clone.placeholder += config.label)
      tempActiveData = clone
      return tempActiveData
    },
    createIdAndKey(item) {
      const config = item.__config__
      config.formId = ++this.idGlobal
      config.renderKey = `${config.formId}${+new Date()}` // 改变renderKey后可以实现强制更新组件
      if (config.layout === 'colFormItem') {
        item.__vModel__ = `field${this.idGlobal}`
      } else if (config.layout === 'rowFormItem') {
        config.componentName = `row${this.idGlobal}`
        !Array.isArray(config.children) && (config.children = [])
        delete config.label // rowFormItem无需配置label属性
      }
      if (Array.isArray(config.children)) {
        config.children = config.children.map(childItem =>
          this.createIdAndKey(childItem)
        )
      }
      return item
    },
    onEnd(obj) {
      if (obj.from !== obj.to) {
        this.fetchData(tempActiveData)
        this.activeData = tempActiveData
        this.activeId = this.idGlobal
      }
    },
    activeFormItem(currentItem) {
      this.activeData = currentItem
      this.activeId = currentItem.__config__.formId
    },
    drawingItemCopy(item, list) {
      let clone = this.$lodash.cloneDeep(item)
      clone = this.createIdAndKey(clone)
      list.push(clone)
      this.activeFormItem(clone)
    },
    drawingItemDelete(index, list) {
      list.splice(index, 1)
      this.$nextTick(() => {
        const len = this.drawingList.length
        if (len) {
          this.activeFormItem(this.drawingList[len - 1])
        }
      })
    }
  }
}
</script>

<style lang="scss">
@import '../style/home.scss';
</style>