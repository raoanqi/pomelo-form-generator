<template>
  <div
    v-if="isExternalLink"
    :style="externalIconStyle"
    class="svg-external-icon svg-icon"
    v-on="$listeners"
  ></div>
  <svg v-else :class="svgClass" v-on="$listeners"></svg>
</template>

<script>
/**
 * @param link
 * @returns {boolean}
 * 判断是否为外部链接
 */
const isExternalLink = link => /^(https?:|mailto:|tel:)/.test(link)
export default {
  props: {
    iconClass: {
      type: String,
      default: () => '',
      required: true
    },
    className: {
      type: String,
      default: () => ''
    }
  },
  computed: {
    isExternalLink() {
      return isExternalLink(this.iconClass)
    },
    iconName() {
      return `#icon-${this.iconClass}`
    },
    svgClass() {
      if (this.className) return `svg-icon ${this.className}`
      return `svg-icon`
    },
    externalIconStyle() {
      return {
        mask: `url(${this.iconClass}) no-repeat 50% 50%`,
        '-webkit-mask': `url(${this.iconClass}) no-repeat 50% 50%`
      }
    }
  }
}
</script>

<style lang="scss"></style>