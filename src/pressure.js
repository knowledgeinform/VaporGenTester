var rpio = require('rpio')
var EventEmitter = require('events')
const ad = require('./abstract-driver.js')
// var async = require('async')

// chip

var IC_ADS1015 = 0x00
var IC_ADS1115 = 0x01

// Pointer Register
var ADS1015_REG_POINTER_MASK = 0x03
var ADS1015_REG_POINTER_CONVERT = 0x00
var ADS1015_REG_POINTER_CONFIG = 0x01
var ADS1015_REG_POINTER_LOWTHRESH = 0x02
var ADS1015_REG_POINTER_HITHRESH = 0x03

// Config Register
var ADS1015_REG_CONFIG_OS_MASK = 0x8000
var ADS1015_REG_CONFIG_OS_SINGLE = 0x8000 // Write: Set to start a single-conversion
var ADS1015_REG_CONFIG_OS_BUSY = 0x0000 // Read: Bit = 0 when conversion is in progress
var ADS1015_REG_CONFIG_OS_NOTBUSY = 0x8000 // Read: Bit = 1 when device is not performing a conversion
var ADS1015_REG_CONFIG_MUX_MASK = 0x7000
var ADS1015_REG_CONFIG_MUX_DIFF_0_1 = 0x0000 // Differential P = AIN0, N = AIN1 (default)
var ADS1015_REG_CONFIG_MUX_DIFF_0_3 = 0x1000 // Differential P = AIN0, N = AIN3
var ADS1015_REG_CONFIG_MUX_DIFF_1_3 = 0x2000 // Differential P = AIN1, N = AIN3
var ADS1015_REG_CONFIG_MUX_DIFF_2_3 = 0x3000 // Differential P = AIN2, N = AIN3
var ADS1015_REG_CONFIG_MUX_SINGLE_0 = 0x4000 // Single-ended AIN0
var ADS1015_REG_CONFIG_MUX_SINGLE_1 = 0x5000 // Single-ended AIN1
var ADS1015_REG_CONFIG_MUX_SINGLE_2 = 0x6000 // Single-ended AIN2
var ADS1015_REG_CONFIG_MUX_SINGLE_3 = 0x7000 // Single-ended AIN3
var ADS1015_REG_CONFIG_PGA_MASK = 0x0E00
var ADS1015_REG_CONFIG_PGA_6_144V = 0x0000 // +/-6.144V range
var ADS1015_REG_CONFIG_PGA_4_096V = 0x0200 // +/-4.096V range
var ADS1015_REG_CONFIG_PGA_2_048V = 0x0400 // +/-2.048V range (default)
var ADS1015_REG_CONFIG_PGA_1_024V = 0x0600 // +/-1.024V range
var ADS1015_REG_CONFIG_PGA_0_512V = 0x0800 // +/-0.512V range
var ADS1015_REG_CONFIG_PGA_0_256V = 0x0A00 // +/-0.256V range
var ADS1015_REG_CONFIG_MODE_MASK = 0x0100
var ADS1015_REG_CONFIG_MODE_CONTIN = 0x0000 // Continuous conversion mode
var ADS1015_REG_CONFIG_MODE_SINGLE = 0x0100 // Power-down single-shot mode (default)
var ADS1015_REG_CONFIG_DR_MASK = 0x00E0
var ADS1015_REG_CONFIG_DR_128SPS = 0x0000 // 128 samples per second
var ADS1015_REG_CONFIG_DR_250SPS = 0x0020 // 250 samples per second
var ADS1015_REG_CONFIG_DR_490SPS = 0x0040 // 490 samples per second
var ADS1015_REG_CONFIG_DR_920SPS = 0x0060 // 920 samples per second
var ADS1015_REG_CONFIG_DR_1600SPS = 0x0080 // 1600 samples per second (default)
var ADS1015_REG_CONFIG_DR_2400SPS = 0x00A0 // 2400 samples per second
var ADS1015_REG_CONFIG_DR_3300SPS = 0x00C0 // 3300 samples per second (also 0x00E0)
var ADS1115_REG_CONFIG_DR_8SPS = 0x0000 // 8 samples per second
var ADS1115_REG_CONFIG_DR_16SPS = 0x0020 // 16 samples per second
var ADS1115_REG_CONFIG_DR_32SPS = 0x0040 // 32 samples per second
var ADS1115_REG_CONFIG_DR_64SPS = 0x0060 // 64 samples per second
var ADS1115_REG_CONFIG_DR_128SPS = 0x0080 // 128 samples per second
var ADS1115_REG_CONFIG_DR_250SPS = 0x00A0 // 250 samples per second (default)
var ADS1115_REG_CONFIG_DR_475SPS = 0x00C0 // 475 samples per second
var ADS1115_REG_CONFIG_DR_860SPS = 0x00E0 // 860 samples per second
var ADS1015_REG_CONFIG_CMODE_MASK = 0x0010
var ADS1015_REG_CONFIG_CMODE_TRAD = 0x0000 // Traditional comparator with hysteresis (default)
var ADS1015_REG_CONFIG_CMODE_WINDOW = 0x0010 // Window comparator
var ADS1015_REG_CONFIG_CPOL_MASK = 0x0008
var ADS1015_REG_CONFIG_CPOL_ACTVLOW = 0x0000 // ALERT/RDY pin is low when active (default)
var ADS1015_REG_CONFIG_CPOL_ACTVHI = 0x0008 // ALERT/RDY pin is high when active
var ADS1015_REG_CONFIG_CLAT_MASK = 0x0004 // Determines if ALERT/RDY pin latches once asserted
var ADS1015_REG_CONFIG_CLAT_NONLAT = 0x0000 // Non-latching comparator (default)
var ADS1015_REG_CONFIG_CLAT_LATCH = 0x0004 // Latching comparator
var ADS1015_REG_CONFIG_CQUE_MASK = 0x0003
var ADS1015_REG_CONFIG_CQUE_1CONV = 0x0000 // Assert ALERT/RDY after one conversions
var ADS1015_REG_CONFIG_CQUE_2CONV = 0x0001 // Assert ALERT/RDY after two conversions
var ADS1015_REG_CONFIG_CQUE_4CONV = 0x0002 // Assert ALERT/RDY after four conversions
var ADS1015_REG_CONFIG_CQUE_NONE = 0x0003 // Disable the comparator and put ALERT/RDY in high state (default)

// This is a javascript port of python, so use objects instead of dictionaries here
// These simplify and clean the code (avoid the abuse of if/elif/else clauses)
var spsADS1115 = {
  8: ADS1115_REG_CONFIG_DR_8SPS,
  16: ADS1115_REG_CONFIG_DR_16SPS,
  32: ADS1115_REG_CONFIG_DR_32SPS,
  64: ADS1115_REG_CONFIG_DR_64SPS,
  128: ADS1115_REG_CONFIG_DR_128SPS,
  250: ADS1115_REG_CONFIG_DR_250SPS,
  475: ADS1115_REG_CONFIG_DR_475SPS,
  860: ADS1115_REG_CONFIG_DR_860SPS,
}

var spsADS1015 = {
  128: ADS1015_REG_CONFIG_DR_128SPS,
  250: ADS1015_REG_CONFIG_DR_250SPS,
  490: ADS1015_REG_CONFIG_DR_490SPS,
  920: ADS1015_REG_CONFIG_DR_920SPS,
  1600: ADS1015_REG_CONFIG_DR_1600SPS,
  2400: ADS1015_REG_CONFIG_DR_2400SPS,
  3300: ADS1015_REG_CONFIG_DR_3300SPS,
}

// Dictionary with the programable gains

var pgaADS1x15 = {
  6144: ADS1015_REG_CONFIG_PGA_6_144V,
  4096: ADS1015_REG_CONFIG_PGA_4_096V,
  2048: ADS1015_REG_CONFIG_PGA_2_048V,
  1024: ADS1015_REG_CONFIG_PGA_1_024V,
  512: ADS1015_REG_CONFIG_PGA_0_512V,
  256: ADS1015_REG_CONFIG_PGA_0_256V,
}

class ADS1x15 extends EventEmitter {
  constructor({address = 0x48, rate = 9600, testFlag = false, sps = 8, pga = 6144, avgWindowSize = 10}) {
    super()
    this.address = address // 0x48, 0x49, etc.
    this.rate = rate // Hz
    this.sps = sps // samples per second (check object for valid choice)
    this.pga = pga // programmable-gate array (sets voltage range, see object)
    this.continuous = true
    this.testFlag = testFlag
    this.avgWindowSize = avgWindowSize
    this.pressure = new ad.DataPoint({value: -1, units: 'kPa'})
    this.initialize()
  }

  convert(data) {
    // takes a voltage and converts it to the pressure
    // console.log('Voltage')
    // console.log(data)
    var x1 = 1
    var y1 = 0 // 1 V
    var x2 = 5 // 5 V
    var y2 = 1000 // kPa
    var scaled = ((y2 - y1) / (x2 - x1) * (data - x1)) + y1
    this.pressure.time = Date.now()
    this.pressure.value = (scaled * (1 / this.avgWindowSize)) + (this.pressure.value * (1 - (1 / this.avgWindowSize)))
    return this.pressure
  }

  readADCDifferential({chP, chN, pga, sps, callback, ic, cal = {slope: 1.0, offset: 0}}) {
    // var self  = this
    // self.busy = true
    // set defaults if not provided
    if (!chP)
      chP = 0
    if (!chN)
      chN = 1
    if (!pga)
      pga = 6144
    if (!sps)
      sps = 250

    // Disable comparator, Non-latching, Alert/Rdy active low
    // traditional comparator, single-shot mode
    var config = ADS1015_REG_CONFIG_CQUE_NONE | ADS1015_REG_CONFIG_CLAT_NONLAT |
    ADS1015_REG_CONFIG_CPOL_ACTVLOW | ADS1015_REG_CONFIG_CMODE_TRAD |
    ADS1015_REG_CONFIG_MODE_CONTIN

    // Set channels
    if ((chP === 0) & (chN === 1)) {
      config |= ADS1015_REG_CONFIG_MUX_DIFF_0_1
    } else if ((chP === 0) & (chN === 3)) {
      config |= ADS1015_REG_CONFIG_MUX_DIFF_0_3
    } else if ((chP === 2) & (chN === 3)) {
      config |= ADS1015_REG_CONFIG_MUX_DIFF_2_3
    } else if ((chP === 1) & (chN === 3)) {
      config |= ADS1015_REG_CONFIG_MUX_DIFF_1_3
    } else {
      // self.busy = false
      console.log('ADS1x15: Invalid channels specified')
      callback('ADS1x15: Invalid channels specified')
    }

    // Set sample per seconds, defaults to 250sps
    // If sps is in the dictionary (defined in init()) it returns the value of the constant
    // othewise it returns the value for 250sps. This saves a lot of if/elif/else code!
    if (ic === IC_ADS1015) {
      config |= spsADS1015[sps]
    } else {
      if ((spsADS1115[sps]) === undefined) {
        // self.busy = false
        callback('ADS1x15: Invalid sps specified')
      } else {
        config |= spsADS1115[sps]
      }
    }
    // Set PGA/voltage range, defaults to +-6.144V
    console.log('pga')
    console.log(pga)
    console.log(pgaADS1x15[pga])
    if (pgaADS1x15[pga] === undefined) {
      // self.busy = false
      callback('ADS1x15: Invalid pga specified')
    } else {
      config |= pgaADS1x15[pga]
    }
    // Set 'start single-conversion' bit
    config |= ADS1015_REG_CONFIG_OS_SINGLE
    // Write config register to the ADC
    var bytes = [(config >> 8) & 0xFF, config & 0xFF]
    console.log(bytes)
    var send = Buffer.from([ADS1015_REG_POINTER_CONFIG, bytes[0], bytes[1]])
    console.log('Send')
    console.log(send)
    var ret = rpio.i2cWrite(send)
    // console.log('Ret')
    // console.log(ret)
    // self.wire.writeBytes(ADS1015_REG_POINTER_CONFIG, bytes, function(err) {
    //   if(err)
    //   {
    //     // self.busy = false
    //     callback('We've got an Error, Lance Constable Carrot!: ' + err.toString())
    //   }
    // })
    // Wait for the ADC conversion to complete
    // The minimum delay depends on the sps: delay >= 1s/sps
    // We add 1ms to be sure

    var delay = Math.round(1000 / sps) + 1

    setInterval(() => {
      var rxbuf = Buffer.alloc(2)
      // var ret = rpio.i2cRead(rxbuf)
      // console.log('rxbuf1')
      // console.log(rxbuf)
      // console.log('Ret1')
      // console.log(ret)
      var send = Buffer.from([ADS1015_REG_POINTER_CONVERT])
      // console.log('Send')
      // console.log(send)
      var ret = rpio.i2cWrite(send)
      // console.log('Ret2')
      // console.log(ret)
      ret = rpio.i2cRead(rxbuf)
      // console.log('rxbuf2')
      // console.log(rxbuf)
      var data = -1
      var val = (rxbuf[0] << 8) | (rxbuf[1])
      if (val > 0x7FFF) {
        data =  (val - 0xFFFF) * pga / 32768.0
      } else {
        data =  ((rxbuf[0] << 8) | (rxbuf[1])) * pga / 32768.0
      }
      // console.log(data/1000)
      data = (data * (1 + cal.slope)) + cal.offset
      data = this.convert(data / 1000)
      this.emit('data', data)
      // console.log(data.value)
      // console.log(cal)
      // console.log('Ret3')
      // console.log(ret)
      // self.wire.readBytes(ADS1015_REG_POINTER_CONVERT, 2, function(err, res) {
      //   var data
      //   if (ic === IC_ADS1015)
      //   {
      //     // Shift right 4 bits for the 12-bit ADS1015 and convert to mV
      //     data = ( ((res[0] << 8) | (res[1] & 0xFF)) >> 4 ) * pga / 2048.0
      //     // self.busy = false
      //     callback(null, data)
      //   }
      //   else
      //   {
      //     // Return a mV value for the ADS1115
      //     // (Take signed values into account as well)
      //     data = -1
      //     var val = (res[0] << 8) | (res[1])
      //     if (val > 0x7FFF)
      //     {
      //       data =  (val - 0xFFFF) * pga / 32768.0
      //     }
      //     else
      //     {
      //       data =  ( (res[0] << 8) | (res[1]) ) * pga / 32768.0
      //     }
      //     // self.busy = false
      //     callback(null, data)
      //   }
      // })
    }, delay)
  }

  error(obj, data) {
    console.log('Error')
    console.log(obj)
    console.log(data)
    this.emit('error', obj, data)
  }

  initialize() {
    if (!this.testFlag) {
      rpio.i2cBegin()
      rpio.i2cSetSlaveAddress(this.address)
      rpio.i2cSetBaudRate(this.rate)    /* 100kHz */
      this.readADCDifferential({chP: 0, chN: 1, pga: this.pga, sps: this.sps, callback: this.error, ic: IC_ADS1115, cal: {slope: 0.2297, offset: 0}})
    }
  }
}

module.exports = {
  Device: ADS1x15,
}
