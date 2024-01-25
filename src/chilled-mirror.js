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

const db = require('./database.js')
const ui = require('./ui.js')
const bkup = require('./backup.js')
const ad = require('./abstract-driver.js')
// const EventEmitter = require('events')
const optiviewCM = require('./opti-view-chilled-mirror.js')

var chilledMirrorID = 'Chilled Mirrors'
var chilledMirrorPath = 'config/' + chilledMirrorID

var linker = {
  'Dew Point': 'dewPoint',
  'Ambient Temperature': 'ambientTemperature',
  'Relative Humidity': 'relativeHumidity',
  Concentration: 'concentration',
  'Wet Bulb Temp.': 'wetBulbTemperature',
  'Water Vap. Pres.': 'vaporPressure',
}

class ChilledMirror {
  constructor({id, type = 'OptiView', testFlag = true}) {
    // super()
    this.ID = new ui.ShowUser({value: id})
    Object.defineProperty(this, 'testFlag', {
      writable: true,
      value: testFlag,
    })
    this.Type = new ui.ShowUser({value: type})

    // hidden defined here to avoid being enumerated
    Object.defineProperty(this, 'hidden', {
      writable: true,
      value: {},
    })
    if (type === 'OptiView') {
      this.hidden = new optiviewCM.Device({address: this.ID.value, testFlag: testFlag})
    } else {
      console.log('UKNOWN CHILLED MIRROR TYPE')
      console.log(type)
    }
    // note that in value, the path is intentionally left undefined for now
    // console.log(testFlag)
    this.datastreams = {refreshRate: 800}
    this.updateable = []
    Object.defineProperty(this, 'updateTimer', {
      writable: true,
    })
    this.initialize()
    this['Dew Point'] = new ui.ShowUser({value: new ad.DataPoint({value: 0, units: 'C'}), type: ['input', 'datapoint']})
    this['Ambient Temperature'] = new ui.ShowUser({value: new ad.DataPoint({value: 0, units: 'C'}), type: ['input', 'datapoint']})
    this['Relative Humidity'] = new ui.ShowUser({value: new ad.DataPoint({value: 0, units: '%RH'}), type: ['input', 'datapoint']})
    this.Concentration = new ui.ShowUser({value: new ad.DataPoint({value: 0, units: 'ppmv'}), type: ['input', 'datapoint']})
    this['Wet Bulb Temp.'] = new ui.ShowUser({value: new ad.DataPoint({value: 0, units: 'C'}), type: ['input', 'datapoint']})
    this['Water Vap. Pres.'] = new ui.ShowUser({value: new ad.DataPoint({value: 0, units: 'Pa'}), type: ['input', 'datapoint']})

    this.Database = new ui.ShowUser({
      value: [{
        id: 'Settings',
        obj: {0: new db.GUI({
          measurementName: 'chilledMirror_basic',
          fields: ['Dew Point',
            'Ambient Temperature',
            'Relative Humidity',
            'Concentration',
            'Wet Bulb Temp.',
            'Water Vap. Pres.'],
          obj: this,
          testFlag: this.testFlag,
          objPath: chilledMirrorPath,
        })},
        path: chilledMirrorPath + '/' + db.path + '/' + bkup.fileName(this) + '.json',
      }],
      type: ['output', 'link'],
    })
  }

  update() {
    Object.entries(linker).forEach(([key]) => {
      this[key].value = this.hidden[linker[key]]
    })
    this.hidden.emit('updated')
  }

  initialize() {
    this.hidden.on('updated', () => {
      // console.log('Updating')
      this.updateTimer = setTimeout(() => {
        this.update()
      }, 500)
    })
    this.hidden.on('error', e => {
      console.log('Chilled Mirror Error detected')
      console.log(e)
      // console.log(this.Database.value[0].obj['0'].Enable)
      if (this.hiddenDBstate === undefined) {
        Object.defineProperty(this, 'hiddenDBstate', {
          writable: true,
          value: this.Database.value[0].obj['0'].Enable.value,
        })
      }
      if (this.Database.value[0].obj['0'].Enable.value) {
        this.Database.value[0].obj['0'].Enable = false
      }
      if (this.updateTimer !== undefined) {
        // this is probably overkill, but it couldn't hurt
        clearTimeout(this.updateTimer)
      }
      setTimeout(() => {
        this.hidden.connect()
      }, 5000)
    })
    this.hidden.on('connected', () => {
      console.log('Chilled Mirror Connected')
      this.update()
      if (this.hiddenDBstate !== undefined) {
        this.Database.value[0].obj['0'].Enable = this.hiddenDBstate
      }
    })
    if (!this.testFlag) {
      this.hidden.initialize()
    }
  }
}

var chilledMirrorMap = {}
var addresses = ['192.12.3.147']

module.exports = {
  initialize: function (test) {
    return new Promise(resolve => {
      test = false
      console.log('intializing chilled mirrors')
      addresses.forEach(address => {
        chilledMirrorMap[address] = new ChilledMirror({id: address, type: 'OptiView', testFlag: test})
      })

      return resolve()
    })
  },
  id: chilledMirrorID,
  obj: chilledMirrorMap,
}
