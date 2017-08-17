const BBCMicrobit = require('bbc-microbit')
const rest = require('restler')
const prompt = require('prompt')

prompt.start()
prompt.colors = false
prompt.message = 'select a '
prompt.delimiter = ''

const APP_ID = process.env['APP_ID']
const APP_SECRET = process.env['APP_SECRET']

function selectServiceType() {
  rest.get(`https://${APP_ID}:${APP_SECRET}@api-staging.planningcenteronline.com/services/v2/service_types?per_page=100`).on('complete', (result) => {
    if (result instanceof Error) {
      console.log('Error:', result.message)
      this.retry(5000); // try again after 5 sec
    } else {
      let index = 0
      result.data.forEach(({attributes}) => {
        index++
        console.log(`${index} - ${attributes.name}`)
      })
      prompt.get('service type', (err, response) => {
        const number = parseInt(response['service type'])
        const { id } = result.data[number - 1]
        selectPlan(id)
      })
    }
  })
}

function selectPlan(serviceTypeId) {
  rest.get(`https://${APP_ID}:${APP_SECRET}@api-staging.planningcenteronline.com/services/v2/service_types/${serviceTypeId}/plans?filter=future&per_page=100`).on('complete', (result) => {
    if (result instanceof Error) {
      console.log('Error:', result.message)
      this.retry(5000); // try again after 5 sec
    } else {
      let index = 0
      result.data.forEach(({attributes}) => {
        index++
        const name = attributes.dates.toString() + (attributes.title ? ` (${attributes.title})` : '')
        console.log(`${index} - ${name}`)
      })
      prompt.get('plan', (err, response) => {
        const number = parseInt(response['plan'])
        const { id } = result.data[number - 1]
        main(serviceTypeId, id)
      })
    }
  })
}

function leftPad(num) {
  return num.length < 2 ? ('0' + num) : num
}

function pollCurrentItem(microbit, baseUrl) {
  const url = `${baseUrl}?include=items,current_item_time`
  rest.get(url).on('complete', (result) => {
    if (result instanceof Error) {
      console.log('Error:', result.message)
    } else {
      const items = result.data.relationships.items.data
      const currentItemTimeId = result.data.relationships.current_item_time.data && result.data.relationships.current_item_time.data.id
      const currentItemTime = result.included.find((res) => res.type == 'ItemTime' && res.id == currentItemTimeId)
      const currentItemId = currentItemTime && currentItemTime.relationships && currentItemTime.relationships.item.data && currentItemTime.relationships.item.data.id
      if (currentItemId) {
        const index = items.findIndex((i) => i.id == currentItemId)
        const progress = (index + 1) / (items.length + 1)
        const ledCount = 25 * progress
        let leds = ''
        for(let i = 0; i < ledCount; i++) {
          leds = leds + '1'
        }
        for(let i = ledCount; i < 25; i++) {
          leds = leds + '0'
        }
        let row1 = leftPad(parseInt(leds.substring(0, 5), 2).toString(16))
        let row2 = leftPad(parseInt(leds.substring(5, 10), 2).toString(16))
        let row3 = leftPad(parseInt(leds.substring(10, 15), 2).toString(16))
        let row4 = leftPad(parseInt(leds.substring(15, 20), 2).toString(16))
        let row5 = leftPad(parseInt(leds.substring(20, 25), 2).toString(16))
        microbit.writeLedMatrixState(new Buffer(row1 + row2 + row3 + row4 + row5, 'hex'))
      } else {
        microbit.writeLedMatrixState(new Buffer('0000000000', 'hex'))
      }
    }
  })
}

function main(serviceTypeId, planId) {
  const baseUrl = `https://${APP_ID}:${APP_SECRET}@api-staging.planningcenteronline.com/services/v2/service_types/${serviceTypeId}/plans/${planId}/live`

  console.log('Scanning for microbit')
  BBCMicrobit.discover((microbit) => {
    console.log('\tdiscovered microbit: id = %s, address = %s', microbit.id, microbit.address)

    microbit.on('disconnect', () => {
      console.log('\tmicrobit disconnected!')
      process.exit(0)
    })

    microbit.on('buttonAChange', (value) => {
      if (value == 1) {
        console.log('go to previous item...')
        rest.post(`${baseUrl}/go_to_previous_item`).on('complete', (result) => {
          if (result instanceof Error) {
            console.log('Error:', result.message)
          } else {
            console.log('  command successful')
            pollCurrentItem(microbit, baseUrl)
          }
        })
      }
    })

    microbit.on('buttonBChange', (value) => {
      if (value == 1) {
        console.log('go to next item...')
        rest.post(`${baseUrl}/go_to_next_item`).on('complete', (result) => {
          if (result instanceof Error) {
            console.log('Error:', result.message)
          } else {
            console.log('  command successful')
            pollCurrentItem(microbit, baseUrl)
          }
        })
      }
    })

    console.log('connecting to microbit')
    microbit.connectAndSetUp(() => {
      console.log('\tconnected to microbit')
      microbit.subscribeButtons()

      pollCurrentItem(microbit, baseUrl)
      setInterval(pollCurrentItem.bind(this, microbit, baseUrl), 10000)
    })
  })
}

selectServiceType()
