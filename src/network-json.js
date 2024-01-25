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

var EventEmitter = require('events')
const superagent = require('superagent')
const ui = require('./ui.js')
const ad = require('./abstract-driver')
const fs = require('fs')
const bkup = require('./backup.js')
const db = require('./database.js')

// get json
// parse JSON
// allow hot-pluggable

var link = {
  RoomAlert: {field: 'sensor', struct: 'array'},
}

var fieldTranslator = {
  RoomAlert: {
    label: {tKey: 'ID', type: ['input', 'string']},
    tempf: {tKey: 'Temperture F', units: 'F', type: ['input', 'datapoint']},
    tempc: {tKey: 'Temperture C', units: 'C', type: ['input', 'datapoint']},
    humid: {tKey: 'Relative Humidity', units: '%', type: ['input', 'datapoint']},
    dpc: {tKey: 'Dew Point C', units: 'C', type: ['input', 'datapoint']},
    dpf: {tKey: 'Dew Point F', units: 'F', type: ['input', 'datapoint']},
    volts: {tKey: 'Volts', units: 'V', type: ['input', 'datapoint'], scale: [{x_low: 0.2, x_high: 4.7, y_low: 15, y_high: 115, units: 'kPa', name: 'Pressure'}]},
  },
}

var dbFields = {
  RoomAlert: {
    measurementName: 'roomAlert_Temp_RH_Volts_Press',
    fields: [
      'sensor 0 ID',
      'sensor 0 Temperture F',
      'sensor 0 Temperture C',
      'sensor 1 ID',
      'sensor 1 Temperture F',
      'sensor 1 Temperture C',
      'sensor 1 Relative Humidity',
      'sensor 1 Dew Point C',
      'sensor 1 Dew Point F',
      'sensor 2 ID',
      'sensor 2 Temperture F',
      'sensor 2 Temperture C',
      'sensor 2 Volts',
      'sensor 2 Pressure',
    ],
  },
}

class NetworkJSON extends EventEmitter {
  constructor({address = '192.12.3.144', basePath = 'getData.json', type = 'RoomAlert', textTest = false, refreshInterval = 300, jsonSensorPath, testFlag = false}) {
    super()
    if (Object.keys(link).includes(type)) {
      this.type = type
    } else {
      console.log('Error! Unknown NetworkJSON type: ' + type)
      console.log('Setting type to: ' + Object.keys(link)[0])
      this.type = Object.keys(link)[0]
    }

    this.textTest = textTest
    this.address = address
    if (jsonSensorPath === undefined) {
      this.jsonSensorPath = 'config/JSON Sensors'
    } else {
      this.jsonSensorPath = jsonSensorPath
    }
    this.testFlag = testFlag
    this.basePath = basePath
    this.refreshInterval = refreshInterval
    this.cur = {} // will become a subservice
    this.object = {}
    // this.initialize()
  }

  getObj() {
    return new Promise((resolve, reject) => {
      if (this.textTest) {
        try {
          var rawdata = fs.readFileSync('NetReturn.json')
          var tobj = JSON.parse(rawdata)
          // console.log(tobj)
          this.cur = tobj
          return resolve()
        } catch (error) {
          console.log('ERROR!!!!')
          console.error(error)
          return reject()
        }
      } else {
        superagent
        .get(this.address + '/' + this.basePath)
        .then(res => {
          if (res.status === 200) {
            var obj = JSON.parse(res.text)
            // console.log(obj)
            this.cur = obj
            // Object.entries(ni).forEach(([key, value], i) => {
            //   this[key] = value
            // })
          }
          return resolve()
        })
        .catch(error => {
          console.log('ERROR!!!!')
          console.error(error)
          return reject()
        })
      }
    })
  }

  define() {
    return new Promise(resolve => {
      // console.log('In defined promise')
      var field = link[this.type].field // e.g. sensor
      // console.log('field')
      // console.log(field)
      // console.log(this.cur[field])
      // this.cur['sensor'] --> array
      if (this.cur[field] !== undefined) {
        Object.entries(this.cur[field]).forEach(([key, value]) => {
          // console.log('key')
          // console.log(key)
          // console.log('value')
          // console.log(value)
          if (link[this.type].struct === 'array') {
            // keys aren't very useful
          }
          // subservice
          Object.entries(value).forEach(([subkey, subvalue]) => {
            // console.log('subkey')
            // console.log(subkey)
            // console.log('subvalue')
            // console.log(subvalue)
            if (Object.prototype.hasOwnProperty.call(fieldTranslator[this.type], subkey)) {
              var initValue = subvalue
              if (fieldTranslator[this.type][subkey].type[1] === 'datapoint') {
                initValue = new ad.DataPoint({value: parseFloat(subvalue), units: fieldTranslator[this.type][subkey].units})
              }
              Object.defineProperty(this.object, field + ' ' + key + ' ' + fieldTranslator[this.type][subkey].tKey, {
                enumerable: true,
                writable: true,
                value: new ui.ShowUser({value: initValue, type: fieldTranslator[this.type][subkey].type}),
              })
              if (subkey === 'volts' && fieldTranslator[this.type][subkey].scale !== undefined) {
                var interpValue = new ad.DataPoint({value: this.interpolate(parseFloat(subvalue), fieldTranslator[this.type][subkey].scale[0]), units: fieldTranslator[this.type][subkey].scale[0].units})
                Object.defineProperty(this.object, field + ' ' + key + ' ' + fieldTranslator[this.type][subkey].scale[0].name, {
                  enumerable: true,
                  writable: true,
                  value: new ui.ShowUser({value: interpValue, type: fieldTranslator[this.type][subkey].type}),
                })
              }
            }
          })
        })
      }
      Object.defineProperty(this.object, 'Address', {
        writable: true,
        value: new ui.ShowUser({value: this.address}),
      })
      if (this.hasAllFields()) {
        console.log('Adding database')
        this.object.Database = new ui.ShowUser({
          value: [{
            id: 'Settings',
            obj: {0: new db.GUI({
              measurementName: dbFields[this.type].measurementName,
              fields: dbFields[this.type].fields,
              tags: ['Address'],
              obj: this.object,
              testFlag: this.testFlag,
              objPath: this.jsonSensorPath,
            })},
            path: this.jsonSensorPath + '/' + db.path + '/' + bkup.fileName(this.object) + '.json',
          }],
          type: ['output', 'link'],
        })
      }

      // console.log('Resolving')
      return resolve()
    })
  }

  interpolate(value, {x_low, x_high, y_low, y_high}) {
    return ((y_high - y_low) / (x_high - x_low) * (value - x_low)) + y_low
  }

  hasAllFields() {
    var hasAll = true
    if (dbFields[this.type] === undefined) {
      hasAll = false
      return hasAll
    }
    if (dbFields[this.type].fields.length === 0) {
      hasAll = false
      return hasAll
    }
    for (var field of dbFields[this.type].fields) {
      if (!Object.keys(this.object).includes(field)) {
        hasAll = false
      }
    }
    return hasAll
  }

  unpackObj() {
    return new Promise(resolve => {
      // console.log('In defined promise')
      var field = link[this.type].field // e.g. sensor
      // console.log('field')
      // console.log(field)
      // console.log(this.cur[field])
      // this.cur['sensor'] --> array
      if (this.cur[field] !== undefined) {
        Object.entries(this.cur[field]).forEach(([key, value]) => {
          // console.log('key')
          // console.log(key)
          // console.log('value')
          // console.log(value)
          if (link[this.type].struct === 'array') {
            // keys aren't very useful
          }
          // subservice
          Object.entries(value).forEach(([subkey, subvalue]) => {
            // console.log('subkey')
            // console.log(subkey)
            // console.log('subvalue')
            // console.log(subvalue)
            if (Object.prototype.hasOwnProperty.call(fieldTranslator[this.type], subkey)) {
              // console.log('Updating: '+field+' '+key+' '+fieldTranslator[this.type][subkey].tKey)
              if (fieldTranslator[this.type][subkey].type[1] === 'datapoint') {
                this.object[field + ' ' + key + ' ' + fieldTranslator[this.type][subkey].tKey].value.time = Date.now()
                this.object[field + ' ' + key + ' ' + fieldTranslator[this.type][subkey].tKey].value.value = parseFloat(subvalue)
              } else {
                this.object[field + ' ' + key + ' ' + fieldTranslator[this.type][subkey].tKey].value = subvalue
              }
              if (subkey === 'volts' && fieldTranslator[this.type][subkey].scale !== undefined) {
                this.object[field + ' ' + key + ' ' + fieldTranslator[this.type][subkey].scale[0].name].value.time = Date.now()
                this.object[field + ' ' + key + ' ' + fieldTranslator[this.type][subkey].scale[0].name].value.value = this.interpolate(parseFloat(subvalue), fieldTranslator[this.type][subkey].scale[0])
              }
            }
          })
        })
      }
      // console.log('Resolving unpack')
      return resolve()
    })
  }

  async update() {
    try {
      await this.getObj()
      await this.unpackObj()
      // console.log(this.object)
    } catch (error) {
      console.log('Update Error for ' + this.type)
      console.log(error)
    }
    if (this.refreshTimer) {
      setTimeout(() => {
        this.update()
      }, this.refreshInterval)
    }
  }

  async initialize() {
    await this.getObj()
    // console.log('Defining')
    await this.define()
    this.refreshTimer = true
    this.update()
    // console.log('Done defining')
    this.emit('initialized')
  }
}

module.exports = {
  Device: NetworkJSON,
}

// var a = new NetworkJSON({textTest: false,refreshInterval: 1000, jsonSensorPath: 'config/JSON Sensors', testFlag: true})
// a.once('initialized', () => {
//   console.log(Object.keys(a.object))
// })
// console.log('Initializing')
// a.initialize()
