// Cf. https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card?_highlight=custome
class ShutterAltCard extends HTMLElement {
    constructor() {
        super();

        this.config = {
            // Lame count number
            lameCount: 20,
            // size
            shutterLameWidth: 200,
            shutterLameHeight: 10,
            // pos
            lamePosX: 10,
            lamePosY: 10
        };
    }

    // Whenever the state changes, a new `hass` object is set. Use this to
    // update your content.
    set hass(hass) {
        console.log("setHass(", hass)

        // Initialize the content if it's not there yet.
        if (!this.content) {
            this.innerHTML = `
        <ha-card header="${this.config.title}">
          <div class="card-content"></div>
        </ha-card>
      `;
            this.content = this.querySelector("div");
        }

        const entityId = this.config.entity;
        const state = hass.states[entityId];
        const stateStr = state ? state.state : "unavailable";

        this.content.innerHTML = this.buildInnterHTML();
    }

    buildInnterHTML() {
        // Compute max size for width and heights
        let maxWidth = this.config.lamePosX * 2 + this.config.shutterLameWidth;
        let maxHeight = this.config.lamePosY * 2 + this.config.shutterLameHeight * this.config.lameCount;

        // Initial position for widget
        let x = this.config.lamePosX;
        let y = this.config.lamePosY;

        let width = this.config.shutterLameWidth;
        let height = this.config.shutterLameHeight;

        let posx = 0;
        let posy = 0;

        let group = "";
        let lame = []
        for (let i = 0; i < this.config.lameCount; i++) {
            lame.push({})
        }
        let lameCount = 1

        // Add all lame
        lame.forEach(() => {
            group += `<rect stroke="#000" id="my-rect-${lameCount}" height="${height}" width="${width}" y="${y + posy}" x="${x + posx}" fill="#fff"/>\n`
            posy += height;
            lameCount += 1;
        })

        return `
        <svg width="${maxWidth}" height="${maxHeight}" xmlns="http://www.w3.org/2000/svg">
        <g>
        <!-- background rectangle -->
        <rect stroke="#bfbfbf" id="my-rect-background" height="${maxHeight}" width="${maxWidth}" y="0" x="0" fill="#bfbfbf"/>
        <!-- lame rectangle -->
        ${group}
        </g>
        </svg>
        `
    }

    setConfig(config) {
        if (!config.entity) {
            throw new Error('You need to define entities');
        }

        this.config = config;

        // Default values
        if (!this.config.lameCount) this.config.lameCount = 20
        if (!this.config.shutterLameWidth) this.config.shutterLameWidth = 200
        if (!this.config.shutterLameHeight) this.config.shutterLameHeight = 10
        if (!this.config.lamePosX) this.config.lamePosX = 10
        if (!this.config.lamePosY) this.config.lamePosY = 10
        if (!this.config.title) this.config.title = "Shutter"
    }

    // The height of your card. Home Assistant uses this to automatically
    // distribute all cards over the available columns.
    getCardSize() {
        return 3;
    }
}

customElements.define("shutter-alt-card", ShutterAltCard);
