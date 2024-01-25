/// ////////////////////////////////////////////////////////////////////////////////////////////////////////////////////
// Copyright (C) 2019 The Johns Hopkins University Applied Physics Laboratory LLC (JHU/APL).  All Rights Reserved.
//
// This material may be only be used, modified, or reproduced by or for the U.S. Government pursuant to the license
// rights granted under the clauses at DFARS 252.227-7013/7014 or FAR 52.227-14. For any other permission, please
// contact the Office of Technology Transfer at JHU/APL: Telephone: 443-778-2792, Internet: www.jhuapl.edu/ott
//
// NO WARRANTY, NO LIABILITY. THIS MATERIAL IS PROVIDED 'AS IS.' JHU/APL MAKES NO REPRESENTATION OR WARRANTY WITH
// RESPECT TO THE PERFORMANCE OF THE MATERIALS, INCLUDING THEIR SAFETY, EFFECTIVENESS, OR COMMERCIAL VIABILITY, AND
// DISCLAIMS ALL WARRANTIES IN THE MATERIAL, WHETHER EXPRESS OR IMPLIED, INCLUDING (BUT NOT LIMITED TO) ANY AND ALL
// IMPLIED WARRANTIES OF PERFORMANCE, MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, AND NON-INFRINGEMENT OF
// INTELLECTUAL PROPERTY OR OTHER THIRD PARTY RIGHTS. ANY USER OF THE MATERIAL ASSUMES THE ENTIRE RISK AND LIABILITY
// FOR USING THE MATERIAL. IN NO EVENT SHALL JHU/APL BE LIABLE TO ANY USER OF THE MATERIAL FOR ANY ACTUAL, INDIRECT,
// CONSEQUENTIAL, SPECIAL OR OTHER DAMAGES ARISING FROM THE USE OF, OR INABILITY TO USE, THE MATERIAL, INCLUDING,
// BUT NOT LIMITED TO, ANY DAMAGES FOR LOST PROFITS.
/// /////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

// create an empty modbus client
const ModbusRTU = require('modbus-serial')
const EventEmitter = require('events')
const ad = require('./abstract-driver.js')

class OptiViewCM extends EventEmitter {
  constructor({address = '192.12.3.147', testFlag = false, id = 1}) {
    super()
    this.client = new ModbusRTU()
    this.address = address
    this.port = 502
    this.testFlag = testFlag
    this.id = id

    this.property = {}
    this.property.dewPoint = new ad.DataPoint({value: 0, units: 'C'})
    this.property.ambientTemperature = new ad.DataPoint({value: 0, units: 'C'})
    this.property.relativeHumidity = new ad.DataPoint({value: 0, units: '%RH'})
    this.property.concentration = new ad.DataPoint({value: 0, units: 'ppmv'})
    this.property.wetBulbTemperature = new ad.DataPoint({value: 0, units: 'C'})
    this.property.vaporPressure = new ad.DataPoint({value: 0, units: 'Pa'})
  }

  getDewPoint() {
    return new Promise((resolve, reject) => {
      this.client.readHoldingRegisters(6, 2, (err, data) => {
        if (err !== null) {
          reject(err)
          return
        }
        this.property.dewPoint.time = Date.now()
        this.property.dewPoint.value = data.buffer.readFloatBE(0)
        resolve()
        return
      })
    })
  }

  get dewPoint() {
    this.getDewPoint().catch(error => {
      console.log('Dew point error')
      console.log(error)
    })
    return this.property.dewPoint
  }

  getAmbientTemperature() {
    return new Promise((resolve, reject) => {
      this.client.readHoldingRegisters(8, 2, (err, data) => {
        if (err !== null) {
          reject(err)
        }
        // console.log('Dew point')
        // console.log(data)
        // console.log(data.buffer.readFloatBE(0))
        this.property.ambientTemperature.time = Date.now()
        this.property.ambientTemperature.value = data.buffer.readFloatBE(0)
        resolve()
      })
    })
  }

  get ambientTemperature() {
    this.getAmbientTemperature().catch(error => {
      console.log('Ambient Temperature error')
      console.log(error)
    })
    return this.property.ambientTemperature
  }

  getRelativeHumidity() {
    return new Promise((resolve, reject) => {
      this.client.readHoldingRegisters(12, 2, (err, data) => {
        if (err !== null) {
          reject(err)
        }
        this.property.relativeHumidity.time = Date.now()
        this.property.relativeHumidity.value = data.buffer.readFloatBE(0)
        resolve()
      })
    })
  }

  get relativeHumidity() {
    this.getRelativeHumidity().catch(error => {
      console.log('Relative humidity error')
      console.log(error)
    })
    return this.property.relativeHumidity
  }

  getConcentration() {
    return new Promise((resolve, reject) => {
      this.client.readHoldingRegisters(14, 2, (err, data) => {
        if (err !== null) {
          reject(err)
        }
        this.property.concentration.time = Date.now()
        this.property.concentration.value = data.buffer.readFloatBE(0)
        resolve()
      })
    })
  }

  get concentration() {
    this.getConcentration().catch(error => {
      console.log('Concentration error')
      console.log(error)
    })
    return this.property.concentration
  }

  getWetBulbTemperature() {
    return new Promise((resolve, reject) => {
      this.client.readHoldingRegisters(22, 2, (err, data) => {
        if (err !== null) {
          reject(err)
        }
        this.property.wetBulbTemperature.time = Date.now()
        this.property.wetBulbTemperature.value = data.buffer.readFloatBE(0)
        resolve()
      })
    })
  }

  get wetBulbTemperature() {
    this.getWetBulbTemperature().catch(error => {
      console.log('Wet bulb temperature error')
      console.log(error)
    })
    return this.property.wetBulbTemperature
  }

  getVaporPressure() {
    return new Promise((resolve, reject) => {
      this.client.readHoldingRegisters(24, 2, (err, data) => {
        if (err !== null) {
          reject(err)
        }
        try {
          this.property.vaporPressure.time = Date.now()
          this.property.vaporPressure.value = data.buffer.readFloatBE(0)
          resolve()
        } catch (error) {
          reject(error)
        }
      })
    })
  }

  get vaporPressure() {
    this.getVaporPressure().catch(error => {
      console.log('Vapor pressure error')
      console.log(error)
      // this.emit('error',e)
    })
    return this.property.vaporPressure
  }

  async connect() {
    try {
      await this.client.connectTCP(this.address, {port: this.port})
      this.client.setID(this.id)
      this.emit('connected')
    } catch (error) {
      console.log('Connection error')
      this.emit('error', error)
    }
  }

  initialize() {
    this.connect().catch(error => {
      console.log('chilled mirror init error')
      console.log(error)
    })
  }
}

module.exports = {
  Device: OptiViewCM,
}

// var ovcm = new OptiViewCM({})
// ovcm.initialize()
// // read the values of 10 registers starting at address 0
// // on device number 1. and log the values to the console.
// setTimeout(() => {
//   setInterval(() => {
//     console.log('Concentration')
//     console.log(ovcm.concentration)
//   }, 1000)
// }, 1000)

// open connection to a tcp line
// client.connectTCP('192.12.3.147', { port: 502 })
// client.setID(1)
