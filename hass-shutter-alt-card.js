// Cf. https://developers.home-assistant.io/docs/frontend/custom-ui/custom-card?_highlight=custome
let __this = undefined;

const SUPPORT = {
    SUPPORT_OPEN: 1,
    SUPPORT_CLOSE: 2,
    SUPPORT_SET_POSITION: 4,
    SUPPORT_STOP: 8,
    SUPPORT_OPEN_TILT: 16,
    SUPPORT_CLOSE_TILT: 32
}

class ShutterAltCard extends HTMLElement {
    // Constructor
    constructor() {
        super();

        this._instance = false;
    }

    // Whenever the state changes, a new `hass` object is set. Use this to
    // update your content.
    set hass(hass) {
        this.log("setHass", hass)

        this.callService = hass.callService;

        const entityId = this.config.entity;
        const state = hass.states[entityId];

        let currentPosition = undefined;

        // Usefull to decode features
        let supported_features = 0;

        if (state) {
            if (state.attributes) {
                supported_features = state.attributes.supported_features ? state.attributes.supported_features : 0;
            }
        }

        // Decode feature
        this.features = {
            open: false,
            close: false,
            setPosition: false,
            openTilt: false,
            closeTilt: false,
            stop: false
        }
        if (supported_features & SUPPORT.SUPPORT_OPEN) {
            this.features.open = true;
        }
        if (supported_features & SUPPORT.SUPPORT_CLOSE) {
            this.features.close = true;
        }
        if (supported_features & SUPPORT.SUPPORT_SET_POSITION) {
            this.features.setPosition = true;
        }
        if (supported_features & SUPPORT.SUPPORT_OPEN_TILT) {
            this.features.openTilt = true;
        }
        if (supported_features & SUPPORT.SUPPORT_CLOSE_TILT) {
            this.features.closeTilt = true;
        }
        if (supported_features & SUPPORT.SUPPORT_STOP) {
            this.features.stop = true;
        }

        const status = state ? state.state : undefined;

        // Build component only once
        if (this._instance === false) {
            this.buildComponent();
            this._instance = true;
        }

        currentPosition = state.attributes.current_position >= 0 ? state.attributes.current_position : undefined;
        if (currentPosition !== undefined) {
            this.setPosition(currentPosition);
        }

        // TODO
        // TILIT handler
        // currentPosition = state.attributes.current_tilt_position >= 0 ? state.attributes.current_tilt_position : undefined;
        // this.setPosition(currentPosition);

        this.log("position current/state/features", currentPosition, status, this.features);
    }

    // drag
    drag(event) {
        if (event.offsetY) {
            if (this.dragSession) {
                let percent = Math.trunc((this.dragSession.offsetY - event.offsetY) / this.dragSession.offsetY * 100) + 5;
                if (percent < 0) percent = 0;
                if (percent > 100) percent = 100;
                this.dragSession.target = "up";
                if (this.config.invertPosition) {
                    this.dragSession.percent = percent;
                } else {
                    this.dragSession.percent = 100 - percent;
                }
                this.myDragValue.innerHTML = `${percent} %`;
            }
        }
    }

    // drag stop
    dragStop(event) {
        if (this.dragSession) {
            this.myDragArea.setAttribute("visibility", "hidden");
            this.myDragValue.innerHTML = `${this.dragSession.percent} %`;
            this.log("[STOP]", this.dragSession.percent);
            this.command("set", 100 - this.dragSession.percent);
        }
        this.dragSession = undefined;
    }

    // drag start
    dragStart(event) {
        if (event.offsetY) {
            this.dragSession = {
                isDragging: true,
                offsetY: event.offsetY,
                percent: 0
            }
            this.myDragArea.setAttribute("visibility", "visible");
            this.log("[START]", this.dragSession);
        }
    }

    // buildComponent
    buildComponent() {
        let map = {
            // mouseMove
            mouseMove: (event) => {
                if (event.cancelable) {
                    event.preventDefault();
                }
                this.drag(event);
            },

            // mouseUp
            mouseUp: (event) => {
                if (event.cancelable) {
                    event.preventDefault();
                }
                this.dragStop(event);
            },

            // mouseDown
            mouseDown: (event) => {
                if (event.cancelable) {
                    event.preventDefault();
                }
                this.dragStart(event);
            }
        }

        // Initialize the content if it's not there yet.
        this.innerHTML = this.buildInnterHTML();

        // Handler
        let cmdUp = this.querySelectorInline(`my-cmd-up-${this.config.entity}`);
        if (cmdUp) {
            ["click", "mousedown", "touchstart", "pointerdown"].forEach((listener) => {
                cmdUp.addEventListener(listener, (e) => {
                    this.eventHandler("up", e, (new Date()).getSeconds());
                });
            });
        }

        let cmdStop = this.querySelectorInline(`my-cmd-stop-${this.config.entity}`);
        if (cmdStop) {
            ["click", "mousedown", "touchstart", "pointerdown"].forEach((listener) => {
                cmdStop.addEventListener(listener, (e) => {
                    this.eventHandler("stop", e, (new Date()).getSeconds());
                });
            });
        }

        let cmdDown = this.querySelectorInline(`my-cmd-down-${this.config.entity}`);
        if (cmdDown) {
            ["click", "mousedown", "touchstart", "pointerdown"].forEach((listener) => {
                cmdDown.addEventListener(listener, (e) => {
                    this.eventHandler("down", e, (new Date()).getSeconds());
                });
            });
        }

        this.myShutter = this.querySelectorInline(`my-shutter-${this.config.entity}`);
        this.myDragListener = this.querySelectorInline(`my-drag-listener-${this.config.entity}`);
        this.myDragArea = this.querySelectorInline(`my-drag-area-${this.config.entity}`);
        this.myDragValue = this.querySelectorInline(`my-drag-value-${this.config.entity}`);

        // Add listener
        this.myDragListener.addEventListener('mousemove', map.mouseMove);
        this.myDragListener.addEventListener('touchmove', map.mouseMove);
        this.myDragListener.addEventListener('pointermove', map.mouseMove);

        this.myDragListener.addEventListener('mousedown', map.mouseDown);
        this.myDragListener.addEventListener('touchstart', map.mouseDown);
        this.myDragListener.addEventListener('pointerdown', map.mouseDown);

        // Global listener to catch all UP (catch them all)
        document.addEventListener('mouseup', map.mouseUp);
        document.addEventListener('touchend', map.mouseUp);
        document.addEventListener('pointerup', map.mouseUp);
    }

    // Handler
    eventHandler(target, event, seconds) {
        if (seconds !== this.eventHandlerLastSeconds) {
            this.eventHandlerLastSeconds = seconds;

            this.log("eventHandler", target, event, seconds);
            this.command(target);
        } else {
            this.log("eventHandler [IGNORE]", target, event, seconds);
        }
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
            return command;
        } else {
            return command;
        }
    }

    // Handler
    command(command, position) {
        let service = undefined;
        let args = {
            position: position
        }

        command = this.invertCheck(command);

        if (this.features.openTilt !== false || this.features.closeTilt !== false) {
            switch (command) {
                case 'up':
                    service = 'open_cover_tilt';
                    break;

                case 'down':
                    service = 'close_cover_tilt';
                    break;
            }
        } else {
            switch (command) {
                case 'up':
                    service = 'open_cover';
                    break;

                case 'down':
                    service = 'close_cover';
                    break;
            }
        }

        switch (command) {
            case 'stop':
                service = 'stop_cover';
                break;

            case 'set':
                service = 'set_cover_position';
                break;
        }

        if (service) {
            this.log("callService", 'cover', service, {
                entity_id: this.config.entity,
                ...args
            });

            this.callService('cover', service, {
                entity_id: this.config.entity,
                ...args
            });

        }
    }

    // Build inner HTML of component
    buildInnterHTML() {
        // Compute max size for width and heights
        this.maxWidth = this.config.lame.x * 2 + this.config.lame.width;
        this.maxHeight = this.config.lame.y * 2 + this.config.lame.height * this.config.lame.count;

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
            group += `<rect stroke = "${this.config.lame.stroke}" id="my-lame-${lameCount}-${this.config.entity}" height = "${height}" width = "${width}" y = "${posy}" x = "${posx}" fill = "${this.config.lame.fill}" />\n`
            posy += height;
            lameCount += 1;
        })

        this.log("motor configuration", this.config.motor)

        // Compute window size
        let windowWidthSize = this.config.lame.width / 2;
        let windowHeightSize = this.maxHeight - this.config.motor.height;
        let glassWidthSize = windowWidthSize - (this.config.window.frame.size * 2);
        let glassHeightSize = windowHeightSize - (this.config.window.frame.size * 3);
        let posYWindow = this.config.motor.y + this.config.motor.height - this.config.lame.height;

        return `
            <ha-card header="${this.config.title}">
                <div class="card-content" style="text-align: center;">

                    <svg id="my-shutter-${this.config.entity}" width="${this.maxWidth}" height="${this.maxHeight}" xmlns="http://www.w3.org/2000/svg">

                        <!-- misc rectangle -->
                        <rect stroke="${this.config.misc.stroke}" id="my-rect-misc-${this.config.entity}" height="${this.maxHeight}" width="${this.maxWidth}" y="0" x="0" fill="${this.config.misc.fill}" />
                        <!-- window -->
                        <g>
                            <rect stroke="black" height="${windowHeightSize}" width="${windowWidthSize}" x="${this.config.lame.x}" y="${posYWindow}" fill="${this.config.window.frame.fill}" />
                            <rect stroke="black" height="${windowHeightSize}" width="${windowWidthSize}" x="${this.config.lame.x + windowWidthSize}" y="${posYWindow}" fill="${this.config.window.frame.fill}" />
                            <rect stroke="black" height="${glassHeightSize}" width="${glassWidthSize}" x="${this.config.lame.x + this.config.window.frame.size}" y="${posYWindow + (this.config.window.frame.size * 2)}" fill="${this.config.window.glass.fill}" />
                            <rect stroke="black" height="${glassHeightSize}" width="${glassWidthSize}" x="${this.config.lame.x + this.config.window.frame.size + windowWidthSize}" y="${posYWindow + (this.config.window.frame.size * 2)}" fill="${this.config.window.glass.fill}" />
                        </g>
                        <g id="my-panel-${this.config.entity}" transform="translate(${x},${y})">
                            <!-- lame rectangle -->
                            ${group}
                        </g>
                        <!-- motor -->
                        <rect stroke="${this.config.motor.stroke}" id="my-rect-motor-${this.config.entity}" height="${this.config.motor.height}" width="${this.maxWidth}" x="${this.config.motor.x}" y="${this.config.motor.y}" fill="${this.config.motor.fill}" />
                        <!-- hud -->
                        <g transform="translate(${this.config.hud.x},${this.config.hud.y})" fill-opacity="${this.config.hud.fillOpacity}">
                            <circle stroke="${this.config.hud.circle.stroke}" id="my-hud-circle-${this.config.entity}" stroke-width="${this.config.hud.circle.strokeSize}" cx="0" cy="0" r="${this.config.hud.circle.size}" fill="${this.config.hud.circle.fill}" />
                            <text id="my-hud-value-${this.config.entity}" text-anchor="middle" x="0" y="5" stroke="${this.config.hud.text.stroke}" stroke-width="1px">N/A</text>
                        </g>
                        <!-- hud -->
                        <g id="my-cmd-up-${this.config.entity}" transform="translate(${this.config.command.up.x},${this.config.command.up.y})" fill-opacity="${this.config.command.fillOpacity}">
                            <circle stroke="${this.config.command.up.stroke}" id="my-up-circle-${this.config.entity}" stroke-width="${this.config.command.up.strokeWidth}" cx="0" cy="0" r="${this.config.command.up.size}" fill="${this.config.command.up.fill}" />
                            <g transform="scale(${this.config.command.up.svg.scale}),translate(${this.config.command.up.svg.x},${-this.config.command.up.svg.y})">
                                ${this.config.command.up.svg.body}
                            </g>
                        </g>
                        <g id="my-cmd-stop-${this.config.entity}" transform="translate(${this.config.command.stop.x},${this.config.command.stop.y})" fill-opacity="${this.config.command.fillOpacity}">
                            <circle stroke="${this.config.command.stop.stroke}" id="my-stop-circle-${this.config.entity}" stroke-width="${this.config.command.stop.strokeWidth}" cx="0" cy="0" r="${this.config.command.stop.size}" fill="${this.config.command.stop.fill}" />
                            <g transform="scale(${this.config.command.stop.svg.scale}),translate(${this.config.command.stop.svg.x},${-this.config.command.stop.svg.y})">
                                ${this.config.command.stop.svg.body}
                            </g>
                        </g>
                        <g id="my-cmd-down-${this.config.entity}" transform="translate(${this.config.command.down.x},${this.config.command.down.y})" fill-opacity="${this.config.command.fillOpacity}">
                            <circle stroke="${this.config.command.down.stroke}" id="my-up-circle-${this.config.entity}" stroke-width="${this.config.command.down.strokeWidth}" cx="0" cy="0" r="${this.config.command.down.size}" fill="${this.config.command.down.fill}" />
                            <g transform="scale(${this.config.command.down.svg.scale}),translate(${this.config.command.down.svg.x},${-this.config.command.down.svg.y})">
                                ${this.config.command.down.svg.body}
                            </g>
                        </g>

                        <!-- misc display -->
                        <g id="my-drag-area-${this.config.entity}" visibility="hidden">
                            <rect stroke="${this.config.drag.background.stroke}" height="${this.maxHeight}" width="${this.maxWidth}" y="0" x="0" fill="${this.config.drag.background.fill}" fill-opacity="${this.config.drag.background.fillOpacity}" />
                            <text id="my-drag-value-${this.config.entity}" text-anchor="middle" font-size="${this.config.drag.text.fontSize}" x="${this.maxWidth / 2}" y="${this.maxHeight / 2}" stroke="${this.config.drag.text.stroke}" stroke-width="${this.config.drag.text.strokeWidth}">N/A</text>
                        </g>
                        <rect id="my-drag-listener-${this.config.entity}" height="${this.config.drag.area.height}" width="${this.config.drag.area.width}" x="${this.config.drag.area.x}" y="${this.config.drag.area.y}" fill-opacity="${this.config.drag.area.fillOpacity}" />

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
            // this.log("Found", selector, collector)
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
            panel.setAttribute("transform", `translate(${this.config.lame.x}, ${this.config.lame.y - realy})`);
        }
        let hud = this.querySelectorInline(`my-hud-value-${this.config.entity}`);
        if (hud) {
            if (this.config.invertPosition) {
                hud.innerHTML = 100 - posy;
            } else {
                hud.innerHTML = posy;
            }
        }
    }

    // Log
    log(message, ...optionalParams) {
        if (this.config.debug) {
            console.log(`[${this.config.entity}]`, message, optionalParams);
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

        // window
        if (!this.config.window) this.config.window = {
            "frame": {
                "size": 10,
                "fill": "white"
            },
            "glass": {
                "fill": "grey"
            }
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
            "fill": "grey"
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

        // invertPosition
        if (!this.config.invertPosition) {
            this.config.invertPosition = false
        }

        // invertCommand
        if (!this.config.invertCommand) {
            this.config.invertCommand = false
        }

        // drag
        if (!this.config.drag) this.config.drag = {
            "area": {
                "x": 65,
                "y": 0,
                "width": 150,
                "height": 220,
                "fillOpacity": 0
            },
            "background": {
                "stroke": "black",
                "fill": "grey",
                "fillOpacity": 0.2
            },
            "text": {
                "stroke": "black",
                "strokeWidth": 1,
                "fontSize": "2em",
                "fill": "black"
            }
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
