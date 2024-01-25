/**
 *  PID Controller.
 */
class Controller {
  constructor(kp, ki, kd, dt, outMax, outMin) {
    let iMax
    if (typeof kp === 'object') {
      let options = kp
      kp = options.kp
      ki = options.ki
      kd = options.kd
      dt = options.dt
      iMax = options.iMax
      outMax = options.outMax
      outMin = options.outMin
    }

    // PID constants
    this.kp = (typeof kp === 'number') ? kp : 1
    this.ki = ki || 0
    this.kd = kd || 0
    this.outMax = outMax || 100
    this.outMin = outMin || -100
    // Interval of time between two updates
    // If not set, it will be automatically calculated
    this.dt = dt || 0

    // Maximum absolute value of sumError
    this.iMax = iMax || 1000

    this.ITerm = 0
    this.lastError = 0
    this.lastTime  = 0

    this.target    = 0 // default value, can be modified with .setTarget
  }

  setTarget(target) {
    this.target = target
  }

  update(currentValue) {
    this.currentValue = currentValue

    // Calculate dt
    let dt = this.dt
    if (!dt) {
      let currentTime = Date.now()
      if (this.lastTime === 0) { // First time update() is called
        dt = 0
      } else {
        dt = (currentTime - this.lastTime) / 1000 // in seconds
      }
      this.lastTime = currentTime
    }
    if (typeof dt !== 'number' || dt === 0) {
      dt = 1
    }

    let error = (this.target - this.currentValue)
    this.ITerm += this.ki * error * dt

    if (this.ITerm > this.outMax) {
      this.ITerm = this.outMax
    } else if (this.ITerm < this.outMin) {
      this.ITerm = this.outMin
    }

    let dError = (error - this.lastError)
    this.lastError = error
    // console.log('Controller updating')
    // console.log(this.kp)
    // console.log(error)
    // console.log(this.ki)
    // console.log(this.ITerm)
    // console.log(this.kd)
    // console.log(dError)
    let MV = (this.kp * error) + this.ITerm - (this.kd * dError)
    if (MV > this.outMax) {
      MV = this.outMax
    }
    if (MV < this.outMin) {
      MV = this.outMin
    }
    return MV
  }

  reset() {
    this.sumError  = 0
    this.lastError = 0
    this.lastTime  = 0
  }
}

module.exports = Controller
