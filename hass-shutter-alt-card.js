// Cf. https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card?_highlight=custome
class ShutterAltCard extends HTMLElement {
    // Constructor
    constructor() {
        super();
    }

    // Whenever the state changes, a new `hass` object is set. Use this to
    // update your content.
    set hass(hass) {
        this.log("setHass", hass)

        this.callService = hass.callService;

        const entityId = this.config.entity;
        const state = hass.states[entityId];

        let currentPosition = undefined;
        let currentTiltPosition = undefined;

        if (state) {
            if (state.attributes) {
                if (!this.config.tilt) {
                    currentPosition = state.attributes.current_position >= 0 ? state.attributes.current_position : undefined;
                } else {
                    currentTiltPosition = state.attributes.current_tilt_position >= 0 ? state.attributes.current_tilt_position : undefined;
                }
            }
        }

        const status = state ? state.state : undefined;

        this.log("position current/tilt/state", currentPosition, currentTiltPosition, status);

        // Initialize the content if it's not there yet.
        this.innerHTML = this.buildInnterHTML();

        // Handler
        let cmdUp = this.querySelectorInline(`my-cmd-up-${this.config.entity}`);
        if (cmdUp) {
            cmdUp.addEventListener("click", (e) => {
                this.eventHandler("up", e);
            });
        }

        let cmdStop = this.querySelectorInline(`my-cmd-stop-${this.config.entity}`);
        if (cmdStop) {
            cmdStop.addEventListener("click", (e) => {
                this.eventHandler("stop", e);
            });
        }

        let cmdDown = this.querySelectorInline(`my-cmd-down-${this.config.entity}`);
        if (cmdDown) {
            cmdDown.addEventListener("click", (e) => {
                this.eventHandler("down", e);
            });
        }

        let positionFilled = false;
        // tilt
        if (this.config.tilt && currentTiltPosition >= 0) {
            positionFilled = true;;
            this.setPosition(currentTiltPosition)
        }

        // no tilt
        if (!this.config.tilt && currentPosition >= 0) {
            positionFilled = true;;
            this.setPosition(currentPosition)
        }

        // status is set
        if (!positionFilled && status === 'open') {
            this.setPosition(100)
        }
        if (!positionFilled && status === 'closed') {
            this.setPosition(0)
        }

    }

    s    // Handler
    eventHandler(target, event) {
        this.log("eventHandler", target, event);
        this.command(target);
    }

    // invert command
    invertCheck(command) {
        if (this.config.invertCommand) {
            if (command === 'up') {
                return "down";
            }
            if (command === 'down') {
                return "up";
            }
        } else {
            return command;
        }
    }

    // Handler
    command(command, position) {
        let service = '';
        let args = '';

        command = this.invertCheck(command);

        if (this.config.tilt) {
            switch (command) {
                case 'up':
                    service = 'open_cover_tilt';
                    break;

                case 'down':
                    service = 'close_cover_tilt';
                    break;

                case 'stop':
                    service = 'stop_cover_tilt';
                    break;
                default:
                    return
            }
        } else {
            switch (command) {
                case 'up':
                    service = 'open_cover';
                    break;

                case 'down':
                    service = 'close_cover';
                    break;

                case 'stop':
                    service = 'stop_cover';
                    break;
                default:
                    return
            }
        }

        this.log("callService", 'cover', service, {
            entity_id: this.config.entity,
            ...args
        });

        this.callService('cover', service, {
            entity_id: this.config.entity,
            ...args
        });
    }

    // Build inner HTML of component
    buildInnterHTML() {
        // Compute max size for width and heights
        let maxWidth = this.config.lame.x * 2 + this.config.lame.width;
        let maxHeight = this.config.lame.y * 2 + this.config.lame.height * this.config.lame.count;

        this.log("lame configuration", this.config.lame)

        // Initial position for lame
        let x = this.config.lame.x;
        let y = this.config.lame.y;

        // Get lame config
        let width = this.config.lame.width;
        let height = this.config.lame.height;

        let posx = 0;
        let posy = 0;

        let group = "";
        let lame = []
        for (let i = 0; i < this.config.lame.count; i++) {
            lame.push({})
        }
        let lameCount = 1

        // Add all lame
        lame.forEach(() => {
            group += `<rect stroke="${this.config.lame.stroke}" id="my-lame-${lameCount}-${this.config.entity}" height="${height}" width="${width}" y="${posy}" x="${posx}" fill="${this.config.lame.fill}"/>\n`
            posy += height;
            lameCount += 1;
        })

        this.log("motor configuration", this.config.motor)

        return `
        <ha-card header="${this.config.title}">
        <div class="card-content" style="text-align: center;">

        <svg id="my-shutter-${this.config.entity}" width="${maxWidth}" height="${maxHeight}" xmlns="http://www.w3.org/2000/svg">

        <!-- misc rectangle -->
        <rect stroke="${this.config.misc.stroke}" id="my-rect-misc-${this.config.entity}" height="${maxHeight}" width="${maxWidth}" y="0" x="0" fill="${this.config.misc.fill}"/>
        <g id="my-panel-${this.config.entity}" transform="translate(${x},${y})">
        <!-- lame rectangle -->
        ${group}
        </g>
        <!-- motor -->
        <rect stroke="${this.config.motor.stroke}" id="my-rect-motor-${this.config.entity}" height="${this.config.motor.height}" width="${maxWidth}" x="${this.config.motor.x}" y="${this.config.motor.y}" fill="${this.config.motor.fill}"/>
        <!-- hud -->
        <g transform="translate(${this.config.hud.x},${this.config.hud.y})" fill-opacity="${this.config.hud.fillOpacity}">
            <circle stroke="${this.config.hud.circle.stroke}" id="my-hud-circle-${this.config.entity}" stroke-width="${this.config.hud.circle.strokeSize}" cx="0" cy="0" r="${this.config.hud.circle.size}" fill="${this.config.hud.circle.fill}"/>
            <text id="my-hud-value-${this.config.entity}" text-anchor="middle" x="0" y="5" stroke="${this.config.hud.text.stroke}" stroke-width="1px">VALUE</text>
        </g>
        <!-- hud -->
        <g id="my-cmd-up-${this.config.entity}" transform="translate(${this.config.command.up.x},${this.config.command.up.y})" fill-opacity="${this.config.command.fillOpacity}">
            <circle stroke="${this.config.command.up.stroke}" id="my-up-circle-${this.config.entity}" stroke-width="${this.config.command.up.strokeWidth}" cx="0" cy="0" r="${this.config.command.up.size}" fill="${this.config.command.up.fill}"/>
            <g transform="scale(${this.config.command.up.svg.scale}),translate(${this.config.command.up.svg.x},${-this.config.command.up.svg.y})">
                ${this.config.command.up.svg.body}
            </g>
        </g>
        <g id="my-cmd-stop-${this.config.entity}" transform="translate(${this.config.command.stop.x},${this.config.command.stop.y})" fill-opacity="${this.config.command.fillOpacity}">
            <circle stroke="${this.config.command.stop.stroke}" id="my-stop-circle-${this.config.entity}" stroke-width="${this.config.command.stop.strokeWidth}" cx="0" cy="0" r="${this.config.command.stop.size}" fill="${this.config.command.stop.fill}"/>
            <g transform="scale(${this.config.command.stop.svg.scale}),translate(${this.config.command.stop.svg.x},${-this.config.command.stop.svg.y})">
                ${this.config.command.stop.svg.body}
            </g>
        </g>
        <g id="my-cmd-down-${this.config.entity}" transform="translate(${this.config.command.down.x},${this.config.command.down.y})" fill-opacity="${this.config.command.fillOpacity}">
            <circle stroke="${this.config.command.down.stroke}" id="my-up-circle-${this.config.entity}" stroke-width="${this.config.command.down.strokeWidth}" cx="0" cy="0" r="${this.config.command.down.size}" fill="${this.config.command.down.fill}"/>
            <g transform="scale(${this.config.command.down.svg.scale}),translate(${this.config.command.down.svg.x},${-this.config.command.down.svg.y})">
                ${this.config.command.down.svg.body}
            </g>
        </g>
        </svg>

        </div>
        </ha-card>
        `
    }

    // Find by selector
    find(element, id, collector) {
        for (let child = 0; child < element.childElementCount; child++) {
            if (element.children[child].id === id) {
                collector.push(element.children[child])
            }
            this.find(element.children[child], id, collector);
        }
    }

    // Find by selector
    querySelectorInline(selector) {
        let collector = [];
        this.find(this, selector, collector);
        if (collector.length === 0) {
            this.log("Unable to find any element with id", selector)
        } else {
            // Found, then return first item
            this.log("Found", selector, collector)
            return collector[0]
        }
    }

    // Fix position
    // posy is a percent value (0% ... 100%)
    setPosition(posy) {
        let realy = undefined;
        if (this.config.invertPosition) {
            realy = (this.config.lame.height * this.config.lame.count) * (100 - posy) / 100;
        } else {
            realy = (this.config.lame.height * this.config.lame.count) * posy / 100;
        }
        this.log("setPosition", this.config.lame.height, this.config.lame.count, this.config.invertPosition, posy, realy);
        let panel = this.querySelectorInline(`my-panel-${this.config.entity}`);
        if (panel) {
            panel.setAttribute("transform", `translate(${this.config.lame.x},${this.config.lame.y - realy})`);
        }
        let hud = this.querySelectorInline(`my-hud-value-${this.config.entity}`);
        if (hud) {
            hud.innerHTML = posy;
        }
    }

    // Log
    log(message, ...optionalParams) {
        if (this.config.debug) {
            console.log("[DEBUG]", message, optionalParams);
        }
    }

    // Config
    setConfig(config) {
        if (!config.entity) {
            throw new Error('You need to define entities');
        }

        // Set config
        this.config = JSON.parse(JSON.stringify(config));

        // shutter
        if (!this.config.misc) this.config.misc = {
            // Color
            "stroke": "#000000",
            "fill": "#bfbfbf"
        }

        // lame
        if (!this.config.lame) this.config.lame = {
            // Initial position of first lame
            "x": 10,
            "y": 10,
            // Width and Height of each lame
            "width": 200,
            "height": 10,
            // Lame count
            "count": 20,
            // Color
            "stroke": "#000000",
            "fill": "#ffffff"
        }

        // motor
        if (!this.config.motor) this.config.motor = {
            // Initial position of motor
            "x": 0,
            "y": 0,
            // Height of motor
            "height": 30,
            // Color
            "stroke": "#000000",
            "fill": "#eebb00"
        }

        // hud
        if (!this.config.hud) this.config.hud = {
            "x": 180,
            "y": 40,
            "fillOpacity": 0.6,
            // Circle
            "circle": {
                "size": 20,
                "strokeSize": 2,
                "stroke": "#000000",
                "fill": "#ffffff"
            },
            // Text
            "text": {
                "stroke": "#000000"
            }
        }

        // tilt
        if (!this.config.tilt) {
            this.config.tilt = false
        }

        // invertPosition
        if (!this.config.invertPosition) {
            this.config.invertPosition = false
        }

        // invertCommand
        if (!this.config.invertCommand) {
            this.config.invertCommand = false
        }

        // command
        if (!this.config.command) this.config.command = {
            // Global
            "fillOpacity": 0.6,
            // Up
            "up": {
                "x": 40,
                "y": 96,
                "svg": {
                    "scale": 0.9,
                    "x": -12,
                    "y": 12,
                    "body": `
                    <path d="M12 11L12 19" stroke="#200E32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M16 11L12 5.00001L8.00001 11L16 11Z" stroke="#200E32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    `
                },
                "stroke": "#000000",
                "strokeWidth": "2",
                "size": 20,
                "fill": "#ffffff"
            },
            // Stop
            "stop": {
                "x": 40,
                "y": 140,
                "svg": {
                    "scale": 0.9,
                    "x": -12,
                    "y": 12,
                    "body": `
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M9 8C8.44772 8 8 8.44772 8 9V15C8 15.5523 8.44772 16 9 16H15C15.5523 16 16 15.5523 16 15V9C16 8.44772 15.5523 8 15 8H9ZM6 9C6 7.34315 7.34315 6 9 6H15C16.6569 6 18 7.34315 18 9V15C18 16.6569 16.6569 18 15 18H9C7.34315 18 6 16.6569 6 15V9Z" fill="#000000"/>
                    `
                },
                "stroke": "#000000",
                "strokeWidth": "2",
                "size": 20,
                "fill": "#ffffff"
            },
            // Down
            "down": {
                "x": 40,
                "y": 184,
                "svg": {
                    "scale": 0.9,
                    "x": -12,
                    "y": 12,
                    "body": `
                    <path d="M12 13L12 5" stroke="#200E32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    <path fill-rule="evenodd" clip-rule="evenodd" d="M8 13L12 19L16 13L8 13Z" stroke="#200E32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                    `
                },
                "stroke": "#000000",
                "strokeWidth": "2",
                "size": 20,
                "fill": "#ffffff"
            }
        }
    }

    // The height of your card. Home Assistant uses this to automatically
    // distribute all cards over the available columns.
    getCardSize() {
        return 3;
    }
}

// Fix Uncaught DOMException: Failed to execute 'define' on 'CustomElementRegistry'
if (!customElements.get('shutter-alt-card')) { customElements.define('shutter-alt-card', ShutterAltCard); }
