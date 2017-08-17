Control [Planning Center Services LIVE](https://planning.center/services/live/) with a [micro:bit](http://microbit.org/).

![demo](https://raw.githubusercontent.com/seven1m/microbit-services-live/master/vid.gif)

## Setup

1.  Clone this repo.

1.  Run `yarn` or `npm install`.

1.  Create a "Personal Access Token" [here](https://api.planningcenteronline.com/oauth/applications).

1.  Power up your micro:bit.

1.  Run the program on a nearby Bluetooth-capable computer like this:

    ```
    APP_ID=your-app-id-here APP_SECRET=your-app-secret-here node index.js
    ```

1.  Select your service type, then select your plan.

1.  Press the buttons on your micro:bit to navigate back and forward in the plan in LIVE.

## License

Copyright Tim Morgan. Licensed MIT.
