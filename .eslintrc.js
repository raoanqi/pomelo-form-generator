module.exports = {
  root: true,
  env: {
    node: true
  },
  extends: ['plugin:vue/essential'],
  rules: {
    'no-unused-vars': 'off',
    'vue/no-unused-components': 'off'
  },
  parserOptions: {
    parser: 'babel-eslint'
  }
}
