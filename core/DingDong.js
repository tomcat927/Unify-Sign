/**
 * 叮咚签到
 */

let { config } = require('../config.js')(runtime, global)
let singletonRequire = require('../lib/SingletonRequirer.js')(runtime, global)
let FloatyInstance = singletonRequire('FloatyUtil')
let widgetUtils = singletonRequire('WidgetUtils')
let automator = singletonRequire('Automator')
let commonFunctions = singletonRequire('CommonFunction')
let localOcrUtil = require('../lib/LocalOcrUtil.js')

let BaseSignRunner = require('./BaseSignRunner.js')
function SignRunner () {
  BaseSignRunner.call(this)
  this.subTasks = config.supported_signs.filter(task => task.taskCode === 'DingDong')[0].subTasks || [
    {
      taskCode: 'creditSign',
      taskName: '积分签到',
      enabled: true,
    },
    {
      taskCode: 'fishpond',
      taskName: '鱼塘签到',
      enabled: true,
    },
  ]
  let CREDIT_SIGN = this.subTasks[0]
  let FISHPOND = this.subTasks[1]
  let _package_name = 'com.yaya.zone'
  let mine_base64 = config.dingdong_config.mine_base64
  let fishpond_entry = config.dingdong_config.fishpond_entry
  let fishpond_check = config.dingdong_config.fishpond_check
  let can_collect = config.dingdong_config.fishpond_can_collect
  let fishpond_daily_collect = config.dingdong_config.fishpond_daily_collect
  let fishpond_normal_collect = config.dingdong_config.fishpond_normal_collect
  let fishpond_close = config.dingdong_config.fishpond_close
  let sign_and_get_points = config.dingdong_config.sign_and_get_points

  // 连续签到
  let continuous_sign = config.dingdong_config.fishpond_continuous_sign
  let do_continuous_sign = config.dingdong_config.fishpond_do_continuous_sign
  let close_continuous_sign = config.dingdong_config.fishpond_close_continuous_sign
  this.restartLimit = 3
  this.exec = function () {
    launch(_package_name)
    sleep(1000)
    FloatyInstance.enableLog()
    this.awaitAndSkip(['\\s*允许\\s*', '\\s*跳过\\s*', '\\s*下次再说\\s*', '\\s*取消\\s*'])
    FloatyInstance.setFloatyText('准备查找 是否存在弹窗广告')
    let closeButton = widgetUtils.widgetGetById('com.yaya.zone:id/iv_(close|cancel)', 4000)
    while (!!closeButton) {
      FloatyInstance.setFloatyInfo({
        x: closeButton.bounds().centerX(),
        y: closeButton.bounds().centerY()
      }, '找到了关闭按钮')
      sleep(500)
      FloatyInstance.setFloatyText('点击关闭')
      automator.clickCenter(closeButton)
      sleep(500)
      closeButton = widgetUtils.widgetGetById('com.yaya.zone:id/iv_(close|cancel)', 1000)
    }
    FloatyInstance.setFloatyText('准备查找 我的')
    let mine = widgetUtils.widgetGetById('com.yaya.zone:id/ani_mine')
    if (!mine) {
      FloatyInstance.setFloatyText('未找到 我的 准备用图片方式查找')
      sleep(1000)
      // id 找不到 用图片查找
      mine = this.wrapImgPointWithBounds(this.captureAndCheckByImg(mine_base64, '我的'))
      if (!mine && localOcrUtil.enabled) {
        FloatyInstance.setFloatyText('未找到 我的 准备用OCR方式查找')
        sleep(1000)
        mine = this.wrapOcrPointWithBounds(this.captureAndCheckByOcr('我的', '我的', [config.device_width / 2, config.device_height * 0.7]))
      }
    }
    if (mine) {
      FloatyInstance.setFloatyInfo({
        x: mine.bounds().centerX(),
        y: mine.bounds().centerY()
      }, '找到了 我的 按钮')
      sleep(600)
      automator.click(mine.bounds().centerX(), mine.bounds().centerY())
      sleep(3000)
      // 领积分
      this.points()
      sleep(1000)
      // 鱼塘
      this.fishpond()
      sleep(1000)
      if (this.isSubTaskExecuted(CREDIT_SIGN, true)
        && this.isSubTaskExecuted(FISHPOND, true)) {
        infoLog(['全部任务完成'])
        this.setExecuted()
      } else {
        warnInfo(['有部分任务未完成'])
      }

    } else {
      FloatyInstance.setFloatyText('未找到 我的')
      if (this.restartLimit-- >= 0) {
        FloatyInstance.setFloatyText('未找到 我的 准备重开应用')
        commonFunctions.killCurrentApp()
        sleep(2000)
        this.exec()
      }
    }
    sleep(3000)
    !config._debugging && commonFunctions.minimize(_package_name)
  }

  this.checkIfContinuousOpen = function () {
    this.captureAndCheckByImg(do_continuous_sign, '立即签到', null, true)
    sleep(2000)
    let closed = this.captureAndCheckByImg(close_continuous_sign, '关闭连续签到', null, true)
    sleep(2000)
    return closed
  }

  this.fishpond = function () {
    if (this.isSubTaskExecuted(FISHPOND)) {
      return
    }
    let fishpond = this.captureAndCheckByImg(fishpond_entry, '叮咚鱼塘')
    if (fishpond) {
      automator.click(fishpond.centerX(), fishpond.centerY())
      sleep(2000)
      let continuousSigned = false
      if (!this.checkForTargetImg(fishpond_check, '鱼塘加载校验')) {
        // 尝试校验是否自动展示了连续签到
        if (!this.checkIfContinuousOpen()) {
          FloatyInstance.setFloatyText('未能正确打开鱼塘 准备重开应用')
          commonFunctions.killCurrentApp()
          sleep(2000)
          return this.exec()
        } else {
          continuousSigned = true
        }
      }
      if (!continuousSigned) {
        let continuousSign = this.captureAndCheckByImg(continuous_sign, '连续签到')
        if (continuousSign) {
          automator.click(continuousSign.centerX(), continuousSign.centerY())
          sleep(2000)
          this.checkIfContinuousOpen()
          sleep(2000)
        }
      }
      // 检测左下角入口 是否有可领取
      let collect = this.captureAndCheckByImg(can_collect, '可领取')
      if (collect) {
        automator.click(collect.centerX(), collect.centerY())
        sleep(1000)
        let sign = this.captureAndCheckByImg(fishpond_daily_collect, '每日签到')
        if (sign) {
          automator.click(sign.centerX(), sign.centerY())
          sleep(1000)
        }
        let sign2 = this.captureAndCheckByImg(fishpond_normal_collect, '奖励领取')
        while (sign2) {
          automator.click(sign2.centerX(), sign2.centerY())
          sleep(2000)
          this.checkForTargetImg(fishpond_check, '鱼塘加载校验')
          sign2 = this.captureAndCheckByImg(fishpond_normal_collect, '奖励领取')
        }
        // ocr保底
        let hasNext = false
        do {
          hasNext = false
          let collectIcon = this.captureAndCheckByOcr('可领取', '可领取')
          if (this.displayButtonAndClick(collectIcon, '可领取')) {
            sleep(1000)
            hasNext = true
          }
        } while (hasNext)
      }
      closeButton = this.captureAndCheckByImg(fishpond_close, '关闭按钮')
      if (closeButton) {
        automator.click(closeButton.centerX(), closeButton.centerY())
      } else {
        automator.back()
      }
      sleep(1000)
      this.setSubTaskExecuted(FISHPOND)
    } else {
      FloatyInstance.setFloatyText('未找到鱼塘入口')
      sleep(1000)
    }
  }

  this.points = function () {
    if (this.isSubTaskExecuted(CREDIT_SIGN)) {
      return
    }
    let pointEntry = widgetUtils.widgetGetOne('(福利.*)?积分')
    if (pointEntry) {
      this.displayButtonAndClick(pointEntry, '领积分', 1000)
      if (widgetUtils.widgetCheck('积分规则|福利中心|签到提醒')) {
        FloatyInstance.setFloatyText('进入积分界面成功')
        sleep(1000)
        let signContentReg = /^(立即|今日)?签到$/
        let findType = widgetUtils.alternativeWidget(signContentReg, '.*(今日已签到|明天签到可).*')
        if (findType === 1) {
          // 先尝试图片识别，因为控件可能位置不正确
          if(!this.captureAndCheckByImg(sign_and_get_points, signContentReg, null, true)) {
            let signBtn = widgetUtils.widgetGetOne(signContentReg)
            this.displayButtonAndClick(signBtn, '立即签到')
          }
          this.setSubTaskExecuted(CREDIT_SIGN)
        } else {
          if (findType === 2) {
            FloatyInstance.setFloatyText('今日已签到')
            this.setSubTaskExecuted(CREDIT_SIGN)
          } else {
            FloatyInstance.setFloatyText('未能找到领积分按钮')
          }
          sleep(1000)
        }
        sleep(500)  
      }
      automator.back()
      sleep(1000)
    }
  }

}

SignRunner.prototype = Object.create(BaseSignRunner.prototype)
SignRunner.prototype.constructor = SignRunner
module.exports = new SignRunner()
