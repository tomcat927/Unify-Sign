/*
 * @Author: TonyJiangWJ
 * @Date: 2020-11-29 13:16:53
 * @Last Modified by: TonyJiangWJ
 * @Last Modified time: 2025-04-09 11:32:22
 * @Description: 组件代码，传统方式，方便在手机上进行修改
 */

const VALIDATOR = {
  // 正整数
  P_INT: {
    validate: () => false,
    message: v => {
      if (v) {
        if (isNaN(v) || parseInt(v) <= 0) {
          return '请输入一个正数'
        }
      }
      return ''
    }
  },
  // 区域信息
  REGION: {
    validate: v => /^(([^0](\d+)|(\d)\s*)\s*,){3}([^0](\d+)|(\d)\s*)\s*$/.test(v),
    message: () => '区域格式不正确'
  },
  // 颜色信息
  COLOR: {
    validate: (v) => /^#[\dabcdef]{6}$/i.test(v),
    message: () => '颜色值格式不正确'
  },
  // 随机范围
  RANDOM_RANGE: {
    validate: () => false,
    message: v => {
      if (v) {
        let rangeCheckRegex = /^(\d+)-(\d+)$/
        if (rangeCheckRegex.test(v)) {
          let execResult = rangeCheckRegex.exec(v)
          let start = parseInt(execResult[1])
          let end = parseInt(execResult[2])
          if (start > end || start <= 0) {
            return '随机范围应当大于零，且 start < end'
          }
        } else {
          return '随机范围请按此格式输入: 5-10'
        }
      }
      return ''
    }
  }
}

let mixin_methods = {
  data: function () {
    return {
      container: '.root-container',
      device: {
        width: 1080,
        height: 2340
      },
      is_pro: false
    }
  },
  methods: {
    stopTouchmove: function (e) {
      e.stopPropagation()
    },
    isNotEmpty: function (v) {
      return !(typeof v === 'undefined' || v === null || v === '')
    },
    getContainer: function () {
      return document.querySelector(this.container)
    },
    trimToEmpty: function (v) {
      if (!this.isNotEmpty(v)) {
        return ''
      } else {
        return ('' + v).trim()
      }
    }
  },
  filters: {
    styleTextColor: function (v) {
      if (/^#[\dabcdef]{6}$/i.test(v)) {
        return { color: v }
      } else {
        return null
      }
    },
    toFixed2: function (v) {
      if (v && typeof v === 'number') {
        return v.toFixed(2)
      } else {
        return v ? v : ''
      }
    }
  }
}

let mixin_common = {
  mixins: [mixin_methods],
  data: function () {
    return {
      configs: {}
    }
  },
  methods: {
    routerTo: function (path) {
      this.$router.push(path)
    },
    saveConfigs: function () {
      this.doSaveConfigs()
    },
    persistCurrentFields: function () {
      this.$store.commit('setCurrentFields', Object.keys(this.configs))
      let _this = this
      this.$store.commit('setConfigChangedCallback', () => _this.loadConfigs())
    },
    loadConfigs: function () {
      $app.invoke('loadConfigs', {}, config => {
        Object.keys(this.configs).forEach(key => {
          // console.log('load config key:[' + key + '] value: [' + config[key] + ']')
          if (!config.hasOwnProperty(key)) {
            console.error('config.js中未配置', key, '请检查代码')
          }
          this.$set(this.configs, key, config[key])
        })
        this.device.width = config.device_width
        this.device.height = config.device_height
        this.is_pro = config.is_pro
        this.onConfigLoad(config)
      })
    },
    onConfigLoad: function (config) { },
    onSaveConfig: function () { },
    doSaveConfigs: function (deleteFields) {
      console.log('执行保存配置')
      let newConfigs = this.filterErrorFields(this.configs)
      if (deleteFields && deleteFields.length > 0) {
        deleteFields.forEach(key => {
          newConfigs[key] = ''
        })
      }
      $app.invoke('saveConfigs', newConfigs)
    },
    filterErrorFields: function (configs) {
      let newConfigs = {}
      Object.assign(newConfigs, configs)
      let errorFields = Object.keys(this.validationError)
      if (errorFields && errorFields.length > 0) {
        errorFields.forEach(key => {
          if (this.isNotEmpty(this.validationError[key])) {
            newConfigs[key] = ''
          }
        })
      }
      return newConfigs
    }
  },
  computed: {
    validationError: function () {
      let errors = {}
      if (this.isNotEmpty(this.validations)) {
        Object.keys(this.validations).forEach(key => {
          let { [key]: value } = this.configs
          let { [key]: validation } = this.validations
          if (this.isNotEmpty(value) && !validation.validate(value)) {
            errors[key] = validation.message(value)
          } else if (!this.isNotEmpty(value) && validation.required) {
            errors[key] = '此项必填'
          } else {
            errors[key] = ''
          }
        })
      }
      return errors
    },
  },
  mounted () {
    this.loadConfigs()
    this.persistCurrentFields()
  },
  destroyed () {
    console.log('保存当前界面配置')
    this.saveConfigs()
    this.$store.commit('clearConfig')
  }
}

/**
 * ColorInputField
 * 颜色值输入组件，用对应颜色显示文字
 */
Vue.component('color-input-field', (resolve, reject) => {
  resolve({
    props: {
      value: String,
      label: String,
      errorMessage: String,
      placeholder: {
        type: String,
        default: '颜色值 #FFFFFF'
      },
      labelWidth: String | Number
    },
    //['value', 'label', 'errorMessage', 'placeholder', 'labelWidth'],
    model: {
      prop: 'value',
      event: 'change'
    },
    mixins: [mixin_methods],
    data () {
      return {
        innerValue: this.value
      }
    },
    watch: {
      innerValue: function (v) {
        if (this.isNotEmpty(this.colorTextErrorMessage)) {
          return
        }
        this.$emit('change', v)
      },
      value: function (v) {
        this.innerValue = v
      }
    },
    computed: {
      colorTextErrorMessage: function () {
        if (this.errorMessage) {
          return this.errorMessage
        }
        if (!/^#[\dabcdef]{6}$/i.test(this.innerValue)) {
          return '颜色值不正确'
        }
        return ''
      }
    },
    template: `<van-field
      :label="label" input-align="right" :error-message="colorTextErrorMessage" error-message-align="right" :label-width="labelWidth">
      <input slot="input" v-model="innerValue" type="text" :placeholder="placeholder" class="van-field__control van-field__control--right"
      :style="innerValue | styleTextColor" />
    </van-field>`
  })
})

/**
 * ColorSlider
 * 颜色值滑动输入组件，分别调整RGB
 */
Vue.component('color-slider', function (resolve, reject) {
  resolve({
    mixins: [mixin_methods],
    props: ['value'],
    model: {
      prop: 'value',
      event: 'color-change'
    },
    data: function () {
      return {
        R: 0,
        G: 0,
        B: 0
      }
    },
    methods: {
      resolveDetailInfo: function () {
        if (/^#[\dabcdef]{6}$/i.test(this.value)) {
          let fullColorVal = parseInt(this.value.substring(1), 16)
          this.R = (fullColorVal >> 16) & 0xFF
          this.G = (fullColorVal >> 8) & 0xFF
          this.B = fullColorVal & 0xFF
        }
      }
    },
    computed: {
      colorText: function () {
        let colorStr = (this.R << 16 | this.G << 8 | this.B).toString(16)
        return '#' + new Array(7 - colorStr.length).join(0) + colorStr
      }
    },
    watch: {
      colorText: function (v) {
        this.$emit('color-change', v)
      },
      value: function (v) {
        this.resolveDetailInfo()
      }
    },
    mounted () {
      this.resolveDetailInfo()
    },
    template: `<div style="padding: 1rem 2rem;">
      <van-row style="margin: 0.5rem 0">
        <van-col><span class="simple-span" :style="colorText | styleTextColor">颜色值: {{colorText}}</span></van-col>
      </van-row>
      <van-row style="margin: 1.5rem 0 2rem 0">
        <van-col :span="24">
          <van-slider v-model="R" :min="0" :max="255" :active-color="'#' + R.toString(16) + '0000'">
            <template #button>
              <div class="custom-slide-button">R:{{ R }}</div>
            </template>
          </van-slider>
        </van-col>
      </van-row>
      <van-row style="margin: 2rem 0">
        <van-col :span="24">
          <van-slider v-model="G" :min="0" :max="255" :active-color="'#00' + G.toString(16) + '00'">
            <template #button>
              <div class="custom-slide-button">G:{{ G }}</div>
            </template>
          </van-slider>
        </van-col>
      </van-row>
      <van-row style="margin: 2rem 0">
        <van-col :span="24">
          <van-slider v-model="B" :min="0" :max="255" :active-color="'#0000' + B.toString(16)">
            <template #button>
              <div class="custom-slide-button">B:{{ B }}</div>
            </template>
          </van-slider>
        </van-col>
      </van-row>
    </div>`
  })
})

/**
 * SwipeColorInputField
 * 组合滑动输入颜色的组件，可以输入文本也可以左滑调出滑动输入控件
 */
Vue.component('swipe-color-input-field', function (resolve, reject) {
  resolve({
    mixins: [mixin_methods],
    props: ['value', 'label', 'errorMessage', 'placeholder', 'labelWidth'],
    model: {
      prop: 'value',
      event: 'change'
    },
    mixins: [mixin_methods],
    data () {
      return {
        innerValue: this.value,
        showColorSlider: false
      }
    },
    watch: {
      innerValue: function (v) {
        this.$emit('change', v)
      },
      value: function (v) {
        this.innerValue = v
      }
    },
    template: `<div>
    <van-swipe-cell stop-propagation>
      <color-input-field :error-message="errorMessage" v-model="innerValue" :label="label" :label-width="labelWidth" :placeholder="placeholder" />
      <template #right>
        <van-button square type="primary" text="滑动输入" @click="showColorSlider=true" />
      </template>
    </van-swipe-cell>
    <van-popup v-model="showColorSlider" position="bottom" :style="{ height: '30%' }" :get-container="getContainer">
      <color-slider v-model="innerValue"/>
    </van-popup>
    </div>`
  })
})

/**
 * RegionSlider
 * 区域信息滑动输入组件，调整x,y,width,height
 */
Vue.component('region-slider', function (resolve, reject) {
  resolve({
    mixins: [mixin_methods],
    props: ['device_height', 'device_width', 'max_height', 'max_width', 'value', 'positionOnly'],
    model: {
      prop: 'value',
      event: 'region-change'
    },
    data: function () {
      return {
        x: 0,
        y: 0,
        width: 0,
        height: 0,
      }
    },
    methods: {
      resolveDetailInfo: function () {
        if (this.positionOnly) {
          if (/^(\d+)\s*,(\d+)\s*$/.test(this.value)) {
            let match = /^(\d+)\s*,(\d+)\s*$/.exec(this.value)
            this.x = parseInt(match[1])
            this.y = parseInt(match[2])
          }
        } else {
          if (/^(\d+)\s*,(\d+)\s*,(\d+)\s*,(\d+)\s*$/.test(this.value)) {
            let match = /^(\d+)\s*,(\d+)\s*,(\d+)\s*,(\d+)\s*$/.exec(this.value)
            this.x = parseInt(match[1])
            this.y = parseInt(match[2])
            this.width = parseInt(match[3])
            this.height = parseInt(match[4])
          }
        }
      },
      resetDeviceInfo: function () {
        $app.invoke('loadConfigs', {}, config => {
          this.device.width = config.device_width
          this.device.height = config.device_height
        })
      },
    },
    computed: {
      regionText: function () {
        return this.x + ',' + this.y + (this.positionOnly ? '' : (',' + this.width + ',' + this.height))
      }
    },
    watch: {
      regionText: function (v) {
        this.$emit('region-change', v)
      },
      value: function (v) {
        this.resolveDetailInfo()
      }
    },
    mounted () {
      this.resolveDetailInfo()
      this.resetDeviceInfo()
    },
    template: `<div style="padding: 1rem 2rem;">
      <van-row style="margin: 0.5rem 0">
        <van-col><span class="simple-span">区域数据: {{regionText}}</span></van-col>
      </van-row>
      <van-row style="margin: 1.5rem 0 2rem 0">
        <van-col :span="24">
          <van-slider v-model="x" :min="0" :max="device_width || device.width" >
            <template #button>
              <div class="custom-slide-button">x:{{ x }}</div>
            </template>
          </van-slider>
        </van-col>
      </van-row>
      <van-row style="margin: 2rem 0">
        <van-col :span="24">
          <van-slider v-model="y" :min="0" :max="device_height || device.height" >
            <template #button>
              <div class="custom-slide-button">y:{{ y }}</div>
            </template>
          </van-slider>
        </van-col>
      </van-row>
      <van-row style="margin: 2rem 0" v-if="!positionOnly">
        <van-col :span="24">
          <van-slider v-model="width" :min="0" :max="max_width || device_width || device.width" >
            <template #button>
              <div class="custom-slide-button">w:{{ width }}</div>
            </template>
          </van-slider>
        </van-col>
      </van-row>
      <van-row style="margin: 2rem 0" v-if="!positionOnly">
        <van-col :span="24">
          <van-slider v-model="height" :min="0" :max="max_height || device_height || device.height" >
            <template #button>
              <div class="custom-slide-button">h:{{ height }}</div>
            </template>
          </van-slider>
        </van-col>
      </van-row>
    </div>`
  })
})

/**
 * RegionInputField
 * 区域信息输入组件，可以直接文本输入也可以左滑调出滑动输入控件
 */
Vue.component('region-input-field', function (resolve, reject) {
  resolve({
    mixins: [mixin_methods],
    props: {
      value: String | Array,
      arrayValue: {
        type: Boolean,
        default: false
      },
      label: String,
      labelWidth: String | Number,
      deviceWidth: Number,
      deviceHeight: Number,
      maxWidth: Number,
      maxHeight: Number,
      errorMessage: String
    },
    model: {
      prop: 'value',
      event: 'change'
    },
    data: function () {
      return {
        innerValue: (() => {
          if (this.arrayValue) {
            if (this.value && this.value.length >= 4) {
              return this.value[0] + ',' + this.value[1] + ',' + this.value[2] + ',' + this.value[3]
            }
          } else {
            return this.value
          }
          return ''
        })(),
        showRegionSlider: false,
      }
    },
    watch: {
      innerValue: function (v) {
        if (!/^(\d+,){3}\d+$/.test(this.innerValue)) {
          return
        }
        if (this.arrayValue && this.isNotEmpty(v)) {
          this.$emit('change', v.split(',').map(v => parseInt(v)))
        } else {
          this.$emit('change', v)
        }
      },
      value: function (v) {
        if (this.arrayValue) {
          if (this.value && this.value.length >= 4) {
            this.innerValue = this.value[0] + ',' + this.value[1] + ',' + this.value[2] + ',' + this.value[3]
          }
        } else {
          this.innerValue = v
        }
      }
    },
    computed: {
      positionErrorMessage: function () {
        if (this.isNotEmpty(this.errorMessage)) {
          return this.errorMessage
        }
        if (!/^(\d+,){3}\d+$/.test(this.innerValue)) {
          return '区域值不正确'
        }
        return ''
      }
    },
    template: `<div>
      <van-swipe-cell stop-propagation>
        <van-field :error-message="positionErrorMessage" error-message-align="right" v-model="innerValue" :label="label"
         :label-width="labelWidth" type="text" placeholder="请输入校验区域" input-align="right" />
        <template #right>
          <van-button square type="primary" text="滑动输入" @click="showRegionSlider=true" style="height: 100%" />
        </template>
      </van-swipe-cell>
      <van-popup v-model="showRegionSlider" position="bottom" :style="{ height: '30%' }" :get-container="getContainer">
        <region-slider :device_width="deviceWidth" :device_height="deviceHeight"
         :max_width="maxWidth" :max_height="maxHeight" v-model="innerValue"/>
      </van-popup>
    </div>`
  })
})

Vue.component('position-input-field', (resolve) => {
  resolve({
    mixins: [mixin_methods],
    props: {
      value: String | Object,
      stringValue: {
        type: Boolean,
        default: false
      },
      deviceWidth: Number,
      deviceHeight: Number,
      errorMessage: String,
      labelWidth: String | Number,
      label: String,
      placeholder: {
        type: String,
        default: '输入坐标位置x,y'
      },
    },
    model: {
      prop: 'value',
      event: 'change'
    },
    data: function () {
      return {
        showRegionSlider: false,
        innerValue: (() => {
          if (this.stringValue) {
            return this.value
          } else {
            if (typeof this.value !== 'undefined' && this.value !== null) {
              return this.trimToEmpty(this.value.x) + ',' + this.trimToEmpty(this.value.y)
            }
          }
          return ''
        })()
      }
    },
    watch: {
      innerValue: function (v) {
        if (this.isNotEmpty(this.positionErrorMessage)) {
          return
        }
        if (!this.stringValue && this.isNotEmpty(v)) {
          let values = v.split(',')
          if (values.length > 1) {
            this.$emit('change', {
              x: parseInt(values[0]),
              y: parseInt(values[1])
            })
          }
        } else {
          this.$emit('change', v)
        }
      },
      value: function (v) {
        if (!this.stringValue) {
          if (typeof this.value !== 'undefined' && this.value !== null) {
            this.innerValue = this.trimToEmpty(this.value.x) + ',' + this.trimToEmpty(this.value.y)
          }
        } else {
          this.innerValue = v
        }
      }
    },
    computed: {
      positionErrorMessage: function () {
        if (this.errorMessage) {
          return this.errorMessage
        }
        if (!/^\d+,\d+$/i.test(this.innerValue)) {
          return '位置信息不正确'
        }
        return ''
      }
    },
    template: `<div>
      <van-swipe-cell stop-propagation>
        <van-field :error-message="positionErrorMessage" error-message-align="right" v-model="innerValue" :label="label"
         :label-width="labelWidth" type="text" placeholder="placeholder" input-align="right" />
        <template #right>
          <van-button square type="primary" text="滑动输入" @click="showRegionSlider=true" />
        </template>
      </van-swipe-cell>
      <van-popup v-model="showRegionSlider" position="bottom" :style="{ height: '30%' }" :get-container="getContainer">
        <region-slider :device_width="deviceWidth" :device_height="deviceHeight"
        :position-only="true" v-model="innerValue"/>
      </van-popup>
      </div>`
  })
})

/**
 * InstalledPackageSelector
 * 已安装应用选择组件，用于选择已安装应用包名
 */
Vue.component('installed-package-selector', function (resolve, reject) {
  resolve({
    mixins: [mixin_methods],
    props: {
      addedPackageNames: {
        type: Array,
        default: () => []
      }
    },
    data () {
      return {
        installedPackages: [{ packageName: 'com.tony.test', appName: 'testApp' }],
        showPackageSelect: false,
        onLoading: true,
        canReadPackage: false,
        readPackages: null,
        searchString: ''
      }
    },
    methods: {
      doLoadInstalledPackages: function () {
        if (this.canReadPackage && this.readPackages !== null) {
          console.log('added pacakges: ' + JSON.stringify(this.addedPackageNames))
          console.log('all pacakges: ' + JSON.stringify(this.readPackages))
          this.installedPackages = this.readPackages.filter(v => this.addedPackageNames.indexOf(v.packageName) < 0)
        } else {
          this.installedPackages = []
        }
        this.onLoading = false
      },
      loadInstalledPackages: function () {
        this.showPackageSelect = true
        this.onLoading = true

        let self = this
        if (self.readPackages === null) {
          // 延迟加载 避免卡顿
          setTimeout(function () {
            $app.invoke('loadInstalledPackages', {}, data => {
              if (data && data.length > 0) {
                self.readPackages = data.sort((a, b) => {
                  if (String.prototype.localeCompare) {
                    return a.appName.localeCompare(b.appName)
                  } else {
                    if (a.appName > b.appName) {
                      return 1
                    } else if (a.appName === b.appName) {
                      return 0
                    } else {
                      return -1
                    }
                  }
                })
                self.canReadPackage = true
              } else {
                self.canReadPackage = false
              }
              self.doLoadInstalledPackages()
            })
          }, 350)
        } else {
          setTimeout(function () {
            self.doLoadInstalledPackages()
          }, 350)
        }
      },
      selectPackage: function (package) {
        this.$emit('value-change', package)
        this.showPackageSelect = false
      },
      doSearch: function (val) {
        this.searchString = val
      },
      cancelSearch: function () {
        this.searchString = ''
      }
    },
    computed: {
      filteredPackages: function () {
        if (this.isNotEmpty(this.searchString)) {
          return this.installedPackages.filter(package => package.appName.indexOf(this.searchString) > -1)
        } else {
          return this.installedPackages
        }
      }
    },
    template: `<div>
      <van-row type="flex" justify="center" style="margin-bottom: 0.5rem">
        <van-col>
          新增应用白名单
          <van-button style="margin-left: 0.4rem" plain hairline type="primary" size="mini" @click="loadInstalledPackages">从已安装的列表中选择</van-button>
        </van-col>
      </van-row>
      <van-popup v-model="showPackageSelect" position="bottom" :style="{ height: '75%' }" :get-container="getContainer">
        <van-search v-model="searchString" show-action @search="doSearch" @cancel="cancelSearch" placeholder="请输入搜索关键词" />
        <van-row v-if="onLoading || !installedPackages || installedPackages.length === 0" type="flex" justify="center" style="margin-top: 8rem;">
          <van-col v-if="onLoading"><van-loading size="3rem" /></van-col>
          <template v-else-if="!installedPackages || installedPackages.length === 0">
            <van-col :style="{ margin: '2rem'}" class="van-cell" v-if="!canReadPackage">无法读取应用列表，请确认是否给与了AutoJS读取应用列表的权限</van-col>
            <van-col :style="{ margin: '2rem'}" class="van-cell" v-else>已安装应用已经全部加入到白名单中了，你可真行</van-col>
          </template>
        </van-row>
        <van-row v-else-if="filteredPackages.length === 0" type="flex" justify="center" style="margin-top: 8rem;">
          <van-col :style="{ margin: '2rem'}" class="van-cell">未找到匹配的应用</van-col>
        </van-row>
        <van-cell v-if="!onLoading" v-for="package in filteredPackages" :key="package.packageName" :title="package.appName" :label="package.packageName" @click="selectPackage(package)"></van-cell>
      </van-popup>
    </div>`
  })
})

/**
 * NumberField
 * 将值转换为数字类型，vant默认的是字符串类型
 */
Vue.component('number-field', resolve => {
  resolve({
    mixins: [mixin_methods],
    props: ['value', 'label', 'labelWidth', 'errorMessage', 'placeholder'],
    model: {
      prop: 'value',
      event: 'change'
    },
    data: function () {
      return {
        innerValue: (() => {
          if (this.isNotEmpty(this.value)) {
            if (typeof v === 'string') {
              this.$emit('change', parseFloat(this.value))
            }
            return parseFloat(this.value)
          } else {
            return null
          }
        })()
      }
    },
    watch: {
      innerValue: function (v) {
        if (this.isNotEmpty(v)) {
          this.$emit('change', parseFloat(v))
        } else {
          this.$emit('change', '')
        }
      },
      value: function (v) {
        if (this.isNotEmpty(v)) {
          this.innerValue = parseFloat(v)
          if (typeof v === 'string') {
            this.$emit('change', this.innerValue)
          }
        } else {
          this.innerValue = ''
        }
      }
    },
    template: `
      <van-field
        v-model="innerValue" :label="label" :label-width="labelWidth" type="number" :error-message="errorMessage" error-message-align="right" :placeholder="placeholder" input-align="right">
        <template #right-icon><slot name="right-icon"></slot></template>
      </van-field>
      `
  })
})

/**
 * TipBlock
 * 用于展示说明信息
 */
Vue.component('tip-block', resolve => {
  resolve({
    mixins: [mixin_methods],
    props: {
      tipFontSize: {
        type: String,
        default: '0.7rem'
      },
      tipFontColor: {
        type: String,
        default: 'gray'
      }
    },
    template: `<van-row>
      <van-col :span="22" :offset="1">
        <span :style="{'color': tipFontColor,'font-size': tipFontSize}"><slot></slot></span>
      </van-col>
    </van-row>`
  })
})

/**
 * SwitchCell
 * 封装是switch按钮
 */
Vue.component('switch-cell', resolve => {
  resolve({
    mixins: [mixin_methods],
    props: {
      switchSize: {
        type: String,
        default: '1.24rem'
      },
      value: Boolean,
      title: String,
      label: String,
      titleStyle: String
    },
    model: {
      prop: 'value',
      event: 'change'
    },
    data: function () {
      return {
        innerValue: this.value
      }
    },
    watch: {
      innerValue: function (v) {
        this.$emit('change', v)
      },
      value: function (v) {
        this.innerValue = v
      }
    },
    template: `
    <van-cell center :title="title" :label="label" :title-style="titleStyle">
      <van-switch v-model="innerValue" :size="switchSize" />
    </van-cell>
    `
  })
})

const FileSelector = {
  mixins: [mixin_common],
  name: 'FileSelector',
  props: {
    title: '',
    initSelectPath: '',
    value: Boolean,
    logFileMatcher: {
      type: Function,
      default: v => true,
    }
  },
  model: {
    prop: 'value',
    event: 'select-change'
  },
  data () {
    return {
      showFileSelectDialog: this.value,
      currentSelectPath: this.initSelectPath,
      readFilePath: '',
      files: [
        { name: '..', type: 'parent' },
        { name: 'logs/', type: 'dir', isDir: true },
        { name: '脚本/', type: 'dir', isDir: true },
        { name: 'logs/', type: 'dir', isDir: true },
        { name: '脚本/', type: 'dir', isDir: true },
        { name: 'logs/', type: 'dir', isDir: true },
        { name: '脚本/', type: 'dir', isDir: true },
        { name: 'logs/', type: 'dir', isDir: true },
        { name: '脚本/', type: 'dir', isDir: true },
        { name: 'logs/', type: 'dir', isDir: true },
        { name: '脚本/', type: 'dir', isDir: true },
        { name: 'login.log', type: 'log', fileSize: 123339 },
        { name: 'log.txt', type: 'txt', fileSize: 111 },
        { name: 'data', type: 'unknown', fileSize: 123339123339 },
      ]
    }
  },
  filters: {
    fileSizeStr: fileSize => {
      if (!fileSize) {
        return '0 B'
      } else {
        return fileSize < 1024 ? fileSize + ' B' :
          fileSize < 1024 * 1024 ? (fileSize / 1024).toFixed(2) + ' KB' :
            fileSize < 1024 * 1024 * 1024 ? (fileSize / 1024 / 1024).toFixed(2) + ' MB' : (fileSize / 1024 / 1024 / 1024).toFixed(2) + ' GB'
      }
    }
  },
  watch: {
    value: function () {
      this.showFileSelectDialog = this.value
    },
    showFileSelectDialog: function (v) {
      this.$emit('select-change', v)
    }
  },
  methods: {
    listFiles: function (path) {
      $nativeApi.request('listLogFiles', { filePath: path || this.currentSelectPath, logFileMatcher: this.logFileMatcher }).then(({ fileResult }) => {
        if (fileResult.error) {
          $app.invoke('toastLog', { message: fileResult.error })
          return
        }
        this.files = [{ name: '..', type: 'parent' }].concat(fileResult.resultList || [])
        this.currentSelectPath = fileResult.path
      })
    },
    selectFile: function (file) {
      let selectedFilePath = this.currentSelectPath + '/' + file.name
      if (file.isDir) {
        this.listFiles(selectedFilePath)
      } else {
        if (file.name === '..') {
          this.listFiles(this.currentSelectPath.substring(0, this.currentSelectPath.lastIndexOf('/')))
          return
        }
        // $app.invoke('toastLog', { message: '选择了文件' + selectedFilePath })
        this.$dialog.confirm({
          message: '是否加载该文件？'
        }).then(() => {
          console.log('选择目标文件：' + selectedFilePath)
          this.readFilePath = selectedFilePath
          this.showFileSelectDialog = false
          this.$emit('file-selected', { filePath: this.readFilePath })
        }).catch(() => { })
      }
    }
  },
  mounted () {
    this.listFiles()
  },
  template: `
  <van-dialog v-model="showFileSelectDialog" :title="title" :show-confirm-button="false" close-on-click-overlay
    get-container="getContainer">
    <div style="width: 100%;height: 400px;overflow: scroll;">
      <van-cell-group>
        <van-cell v-for="file in files" class="file-cell" @click="selectFile(file)">
          <template #title>
            <div class="van-cell__title file-container">
              <img v-if="file.type==='parent'" class="up-dir">
              <img v-else-if="file.type==='dir'" class="folder">
              <img v-else-if="file.type==='log' || file.type==='txt'" class="log">
              <img v-else class="unknown">
              <span>{{file.name}}</span>
              <span v-if="file.type !== 'dir' && file.type !== 'parent'" class="file-size">{{file.fileSize | fileSizeStr}}</span>
            </div>
          </template>
        </van-cell>
      </van-cell-group>
    </div>
  </van-dialog>
  `
}

/**
 * Base64ImageViewer
 * 封装是switch按钮
 */
Vue.component('base64-image-viewer', resolve => {
  resolve({
    mixins: [mixin_methods],
    components: { FileSelector },
    props: {
      value: String,
      title: String,
      titleStyle: String
    },
    model: {
      prop: 'value',
      event: 'change'
    },
    data: function () {
      return {
        innerValue: this.value,
        showBase64Inputer: false,
        showBase64Selector: false,
      }
    },
    computed: {
      base64Data: function () {
        if (this.innerValue) {
          return 'data:image/png;base64,' + this.innerValue
        }
        return null
      }
    },
    watch: {
      innerValue: function (v) {
        this.$emit('change', v)
      },
      value: function (v) {
        this.innerValue = v
      }
    },
    methods: {
      handleFileSelect: function ({ filePath }) {
        console.log('准备加载文件内容：' + filePath)
        $nativeApi.request('loadFileContent', { filePath: filePath }).then(({ fileContent }) => {
          this.innerValue = fileContent
        })
      }
    },
    template: `
    <div>
      <van-swipe-cell stop-propagation>
        <div class="base64-viewer">
          <label>{{title}}:</label>
          <img :src="base64Data" class="base64-img"/>
        </div>
        <template #right>
          <van-button square type="primary" text="加载文件" @click="showBase64Selector=true" />
          <van-button square type="primary" text="修改Base64" @click="showBase64Inputer=true" />
        </template>
      </van-swipe-cell>
      <file-selector v-model="showBase64Selector" @file-selected="handleFileSelect" />
      <van-popup v-model="showBase64Inputer" position="bottom" :style="{ height: '30%', alignItems: 'center' }" :get-container="getContainer">
        <tip-block>左滑可清空数据</tip-block>
        <van-swipe-cell stop-propagation style="width:100%">
          <van-field v-model="innerValue" label="图片base64" type="textarea" placeholder="请输入base64" input-align="right" rows="6" />
          <template #right>
            <van-button square type="primary" text="清空" @click="innerValue=''" style="height:100%" />
          </template>
        </van-swipe-cell>
      </van-popup>
    </div>
    `
  })
})

/**
 * ImageCell
 * 封装是switch按钮
 */
Vue.component('image-cell', resolve => {
  resolve({
    mixins: [mixin_methods],
    components: { FileSelector },
    props: {
      value: String,
      title: String,
      titleStyle: String
    },
    model: {
      prop: 'value',
      event: 'change'
    },
    data: function () {
      return {
        innerValue: this.value,
        showBase64Inputer: false,
        showBase64Selector: false,
      }
    },
    computed: {
      base64Data: function () {
        if (this.innerValue) {
          return 'data:image/png;base64,' + this.innerValue
        }
        return null
      }
    },
    watch: {
      innerValue: function (v) {
        this.$emit('change', v)
      },
      value: function (v) {
        this.innerValue = v
      }
    },
    methods: {
      handleFileSelect: function ({ filePath }) {
        console.log('准备加载文件内容：' + filePath)
        $nativeApi.request('loadFileContent', { filePath: filePath }).then(({ fileContent }) => {
          this.innerValue = fileContent
        })
      }
    },
    template: `
    <div>
      <div class="base64-viewer">
        <img :src="base64Data" class="base64-img"/>
        <van-cell :title="accountInfo.account" :label="accountInfo.accountName" clickable @click="changeMainAccount(idx)">
          <template #right-icon>
            <slot name="right-icon"></slot>
          </template>
        </van-cell>
      </div>
      <file-selector v-model="showBase64Selector" @file-selected="handleFileSelect" />
      <van-popup v-model="showBase64Inputer" position="bottom" :style="{ height: '30%', alignItems: 'center' }" :get-container="getContainer">
        <tip-block>左滑可清空数据</tip-block>
        <van-swipe-cell stop-propagation style="width:100%">
          <van-field v-model="innerValue" label="图片base64" type="textarea" placeholder="请输入base64" input-align="right" rows="6" />
          <template #right>
            <van-button square type="primary" text="清空" @click="innerValue=''" style="height:100%" />
          </template>
        </van-swipe-cell>
      </van-popup>
    </div>
    `
  })
})


function formatDate (date, fmt) {
  if (typeof fmt === 'undefined') {
    fmt = "yyyy-MM-dd HH:mm:ss"
  }

  var o = {
    'M+': date.getMonth() + 1, // 月份
    'd+': date.getDate(), // 日
    'h+': date.getHours() % 12 === 0 ? 12 : date.getHours() % 12, // 小时
    'H+': date.getHours(), // 小时
    'm+': date.getMinutes(), // 分
    's+': date.getSeconds(), // 秒
    'q+': Math.floor((date.getMonth() + 3) / 3), // 季度
    'S': date.getMilliseconds() // 毫秒
  }
  var week = {
    '0': '\u65e5',
    '1': '\u4e00',
    '2': '\u4e8c',
    '3': '\u4e09',
    '4': '\u56db',
    '5': '\u4e94',
    '6': '\u516d'
  }
  let execResult
  if (/(y+)/.test(fmt)) {
    execResult = /(y+)/.exec(fmt)
    fmt = fmt.replace(execResult[1], (date.getFullYear() + '').substring(4 - execResult[1].length))
  }
  if (/(E+)/.test(fmt)) {
    execResult = /(E+)/.exec(fmt)
    fmt = fmt.replace(execResult[1], ((execResult[1].length > 1) ? (execResult[1].length > 2 ? '\u661f\u671f' : '\u5468') : '') + week[date.getDay() + ''])
  }
  for (var k in o) {
    if (new RegExp('(' + k + ')').test(fmt)) {
      execResult = new RegExp('(' + k + ')').exec(fmt)
      fmt = fmt.replace(execResult[1], (execResult[1].length === 1) ? (o[k]) : (('00' + o[k]).substring(('' + o[k]).length)))
    }
  }
  return fmt
}

API = {
  post: function (url, data) {
    return axios.post(url, data)
      .then(resp => Promise.resolve(resp.data))
      .catch(e => Promise.reject(e))
  },
  get: function (url, data) {
    return axios.get(url, data)
      .then(resp => Promise.resolve(resp.data))
      .catch(e => Promise.reject(e))
  }
}