class ShutterAltCard extends HTMLElement {
    constructor() {
        super();
        this._hass = null;
        this._shutter = null;

        this.config = {
            // Associated entities
            entities: [],
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

    get hass() {
        return this._hass;
    }

    set hass(value) {
        this._hass = value;

        this._shutter = document.createElement('div');
        this.appendChild(this._shutter)

        let maxWidth = this.config.lamePosX * 2 + this.config.shutterLameWidth;
        let maxHeight = this.config.lamePosY * 2 + this.config.shutterLameHeight * this.config.lameCount;

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

        this._shutter.innerHTML = `
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

    static observedAttributes = ["hass"];

    attributeChangedCallback(name, oldValue, newValue) {
        // name will always be "country" due to observedAttributes
        if (name === "hass") {
            this._hass = newValue;
        }
        this._updateRendering();
    }

    connectedCallback() {
        this._updateRendering();
    }

    _updateRendering() {
    }

    setConfig(config) {
        if (!config.entities) {
            throw new Error('You need to define entities');
        }

        this.config = config;
    }
}

customElements.define("shutter-alt-card", ShutterAltCard);
