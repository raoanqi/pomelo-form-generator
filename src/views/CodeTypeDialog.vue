<template>
  <div>
    <el-dialog
      v-bind="$attrs"
      v-on="$listeners"
      title="请指定生成的组件属性"
      :close-on-click-modal="false"
      :modal-append-to-body="false"
      @open="onOpen"
      width="500px"
    >
      <el-row :gutter="15">
        <el-form ref="elForm" :model="formData" :rules="rules" size="medium" label-width="100px" label-position="left">
          <el-col :span="24">
            <el-form-item label="生成类型" prop="type">
              <el-radio-group v-model="formData.type">
                <el-radio
                  v-for="(item, index) in typeOptions"
                  :key="index"
                  :label="item.value"
                  :disabled="item.disabled"
                >
                  {{ item.label }}
                </el-radio>
              </el-radio-group>
            </el-form-item>
            <el-form-item v-if="showFileName" label="组件名称" prop="fileName">
              <el-input v-model="formData.fileName" placeholder="请输入文件名，默认为时间戳" clearable />
            </el-form-item>
          </el-col>
        </el-form>
      </el-row>
      <span slot="footer">
        <el-button @click="close">取消</el-button>
        <el-button type="primary" @click="handelConfirm">保存组件</el-button>
      </span>
    </el-dialog>
  </div>
</template>
<script>
export default {
  inheritAttrs: false,
  props: ['showFileName'],
  data() {
    return {
      formData: {
        fileName: undefined,
        type: 'file'
      },
      rules: {
        fileName: [
          {
            required: true,
            message: '请输入文件名',
            trigger: 'blur'
          }
        ],
        type: [
          {
            required: true,
            message: '生成类型不能为空',
            trigger: 'change'
          }
        ]
      },
      typeOptions: [
        {
          label: '页面',
          value: 'file'
        },
        {
          label: '弹窗',
          value: 'dialog'
        }
      ]
    }
  },
  methods: {
    onOpen() {
      if (this.showFileName) {
        this.formData.fileName = `${+new Date()}.vue`
      }
    },
    close(e) {
      this.$emit('update:visible', false)
    },
    handelConfirm() {
      this.$refs.elForm.validate(valid => {
        if (!valid) return
        this.$emit('confirm', { ...this.formData })
        this.close()
      })
    }
  }
}
</script>