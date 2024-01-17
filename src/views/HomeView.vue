<template>
  <div class="container">
    <div class="left-board">
      <div class="logo-wrapper">
        <div class="logo">Draggable Form Generator</div>
      </div>
      <el-scrollbar class="left-scrollbar">
        <div class="components-list">
          <span>原子组件列表</span>
          <!--list：需要拖放的元素数组-->
          <!--group：实现拖拽元素的同步-->
          <!--draggable：-->
          <!--end：拖拽结束之后触发的事件-->
          <draggable
            class="components-draggable"
            :list="supportComponents"
            :group="{ name: 'componentsGroup', pull: 'clone', put: false }"
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
        <el-button icon="el-icon-download" type="text" @click="download"> 生成Vue组件</el-button>
        <el-button class="delete-btn" icon="el-icon-delete" type="text" @click="empty"> 清空表单</el-button>
      </div>
      <el-scrollbar class="center-scrollbar">
        <el-row class="center-board-row" :gutter="formConfig.gutter">
          <el-form
            :size="formConfig.size"
            :label-position="formConfig.labelPosition"
            :disabled="formConfig.disabled"
            :label-width="`${formConfig.labelWidth}px`"
          >
            <draggable class="drawing-board" :list="drawingList" :animation="340" group="componentsGroup">
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
            <div v-show="!drawingList.length" class="empty-info">拖拽或点击组件进行配置</div>
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
    <code-type-dialog :visible.sync="dialogVisible" :show-file-name="showFileName" @confirm="generate" />
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
import { titleCase, deepClone, beautifierConf, isObjectObject } from '@/utils/index'
import { makeUpHtml, vueScript, vueTemplate, cssStyle } from '@/components/generator/html'
import { makeUpJs } from '@/components/generator/js'
import { makeUpCss } from '@/components/generator/css'
import { getIdGlobal, getDrawingList, getFormConf, saveDrawingList, saveIdGlobal } from '@/utils/db'
import loadBeautifier from '@/utils/loadBeautifier'

import FormDrawer from '@/views/FormDrawer.vue'
import JsonDrawer from '@/views/JsonDrawer.vue'
import RightPanel from '@/views/RightPanel.vue'
import ComponentTypeDialog from '@/views/ComponentTypeDialog.vue'
import DraggableItem from '@/views/DraggableItem.vue'
import CodeTypeDialog from '@/views/CodeTypeDialog.vue'

const drawingListInDB = getDrawingList()
const idGlobal = getIdGlobal()
const formConfInDB = getFormConf()

let tempActiveData, beautifier, oldActiveId

export default {
  name: 'HomeView',
  components: {
    draggable,
    FormDrawer,
    JsonDrawer,
    RightPanel,
    ComponentTypeDialog,
    DraggableItem,
    CodeTypeDialog
  },
  data() {
    return {
      supportComponents,
      formConfig,
      drawingList: drawingFormItems,
      activeId: drawingFormItems[0].formId,
      activeData: drawingFormItems[0],
      dialogVisible: false,
      showFileName: false,
      operationType: '',
      generateConf: null,
      saveDrawingListDebounce: debounce(340, saveDrawingList),
      idGlobal,
      saveIdGlobalDebounce: debounce(340, saveIdGlobal)
    }
  },
  mounted() {
    if (Array.isArray(drawingListInDB) && drawingListInDB.length > 0) {
      this.drawingList = drawingListInDB
    } else {
      this.drawingList = drawingFormItems
    }
    this.activeFormItem(this.drawingList[0])
    if (formConfInDB) {
      this.formConf = formConfInDB
    }
    loadBeautifier(btf => {
      beautifier = btf
    })
    const clipboard = new ClipboardJS('#copyNode', {
      text: trigger => {
        const codeStr = this.generateCode()
        this.$notify({
          title: '成功',
          message: '代码已复制到剪切板，可粘贴。',
          type: 'success'
        })
        return codeStr
      }
    })
    clipboard.on('error', e => {
      this.$message.error('代码复制失败')
    })
  },
  watch: {
    // eslint-disable-next-line func-names
    'activeData.__config__.label': function (val, oldVal) {
      if (
        this.activeData.placeholder === undefined ||
        !this.activeData.__config__.tag ||
        oldActiveId !== this.activeId
      ) {
        return
      }
      this.activeData.placeholder = this.activeData.placeholder.replace(oldVal, '') + val
    },
    activeId: {
      handler(val) {
        oldActiveId = val
      },
      immediate: true
    },
    drawingList: {
      handler(val) {
        this.saveDrawingListDebounce(val)
        if (val.length === 0) this.idGlobal = 100
      },
      deep: true
    },
    idGlobal: {
      handler(val) {
        this.saveIdGlobalDebounce(val)
      },
      immediate: true
    }
  },
  methods: {
    setLoading(component, val) {
      const { directives } = component
      if (Array.isArray(directives)) {
        const t = directives.find(d => d.name === 'loading')
        if (t) t.value = val
      }
    },
    setRespData(component, resp) {
      const { dataPath, renderKey, dataConsumer } = component.__config__
      if (!dataPath || !dataConsumer) return
      const respData = dataPath.split('.').reduce((pre, item) => pre[item], resp)
      this.setObjectValueReduce(component, dataConsumer, respData)
      const i = this.drawingList.findIndex(item => item.__config__.renderKey === renderKey)
      if (i > -1) this.$set(this.drawingList, i, component)
    },
    setObjectValueReduce(obj, strKeys, data) {
      const arr = strKeys.split('.')
      arr.reduce((pre, item, i) => {
        if (arr.length === i + 1) {
          pre[item] = data
        } else if (!isObjectObject(pre[item])) {
          pre[item] = {}
        }
        return pre[item]
      }, obj)
    },
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
        config.children = config.children.map(childItem => this.createIdAndKey(childItem))
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
    },
    run() {
      this.dialogVisible = true
      this.showFileName = false
      this.operationType = 'run'
    },
    download() {
      this.dialogVisible = true
      this.showFileName = true
      this.operationType = 'download'
    },
    async empty() {
      try {
        await this.$confirm('您正准备清空所有表单项，是否继续？', '确认', { type: 'warning' })
        this.drawingList = []
        this.idGlobal = 100
      } catch (error) {
        return
      }
    },
    generate(data) {
      const func = this[`exec${titleCase(this.operationType)}`]
      this.generateConf = data
      func && func(data)
    },
    execDownload(data) {
      const codeStr = this.generateCode()
      const blob = new Blob([codeStr], { type: 'text/plain;charset=utf-8' })
      saveAs(blob, data.fileName)
    },
    generateCode() {
      const { type } = this.generateConf
      this.AssembleFormData()
      const script = vueScript(makeUpJs(this.formData, type))
      const html = vueTemplate(makeUpHtml(this.formData, type))
      const css = cssStyle(makeUpCss(this.formData))
      return beautifier.html(html + script + css, beautifierConf.html)
    },
    AssembleFormData() {
      this.formData = {
        fields: deepClone(this.drawingList),
        ...this.formConf
      }
    },
    tagChange(newTag) {
      newTag = this.cloneComponent(newTag)
      const config = newTag.__config__
      newTag.__vModel__ = this.activeData.__vModel__
      config.formId = this.activeId
      config.span = this.activeData.__config__.span
      this.activeData.__config__.tag = config.tag
      this.activeData.__config__.tagIcon = config.tagIcon
      this.activeData.__config__.document = config.document
      if (typeof this.activeData.__config__.defaultValue === typeof config.defaultValue) {
        config.defaultValue = this.activeData.__config__.defaultValue
      }
      Object.keys(newTag).forEach(key => {
        if (this.activeData[key] !== undefined) {
          newTag[key] = this.activeData[key]
        }
      })
      this.activeData = newTag
      this.updateDrawingList(newTag, this.drawingList)
    },
    updateDrawingList(newTag, list) {
      const index = list.findIndex(item => item.__config__.formId === this.activeId)
      if (index > -1) {
        list.splice(index, 1, newTag)
      } else {
        list.forEach(item => {
          if (Array.isArray(item.__config__.children)) this.updateDrawingList(newTag, item.__config__.children)
        })
      }
    }
  }
}
</script>

<style lang="scss">
@import '../style/home.scss';
</style>