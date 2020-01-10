const fs = require('fs');
const os = require('os');
const path = require('path');
const dotenv = require('dotenv');
const YAML = require('js-yaml');


class MVTools {
    constructor () {

        this.REGEXP = {
            EMAIL: /^[\w-\.]+@[\w-]+\.[a-z]{2,4}$/i,
        };
    }

    readEnv () {
        dotenv.config();
    }

    getHostname () {
        return os.hostname();
    }

    readFileSync (filename, charset = 'utf8') {
        return fs.readFileSync(filename, charset);
    }

    __merge (recursive, ...objects) {
        let object = {};
        for (let nObject of objects) {
            if (nObject instanceof Object) {
                for (let key in nObject) {
                    if (nObject.hasOwnProperty(key)) {
                        if (recursive && object[key] instanceof Object && nObject[key] instanceof Object ) {
                            nObject[key] = this.__merge(true, object[key], nObject[key])
                        }
                        object[key] = nObject[key];
                    }
                }
            } else {
                object = nObject;
            }
        }
        return object;
    }

    merge (...objects) {
        return this.__merge(false, ...objects);
    }

    mergeRecursive(...objects) {
        return this.__merge(true, ...objects);
    }

    empty (variable) {
        return variable === undefined
            || variable === null
            || variable === false
            || variable === ''
            || variable === {}
            || (Array.isArray(variable) && variable.length === 0);
    }

    emptyExtracted (path, target = process) {
        const extracted = this.extract(path, target);
        return this.empty(extracted);
    }

    isString (data) {
        return (typeof data === "string" || data instanceof String);
    }

    isScalar (mixed_var) {
        // http://kevin.vanzonneveld.net
        return (/boolean|number|string/).test(typeof mixed_var);
    }

    inside (value, array) {
        let result = false;
        if (Array.isArray(array)) {
            result = array.indexOf(value) === -1;
        } else {
            for (var i = 0; i < array.length; i++) {
                if (value === array[i]) {
                    result = true;
                }
            }
        }
        return result;
    }

    indexOfByValues (values, object) {
        let result = -1;
        if (this.isScalar(values) && Array.isArray(object)) {
            result = object.indexOf(values);
        } else {
            for (let index in object) {
                if (object.hasOwnProperty(index)) {
                    let localInside = true;
                    if (this.isScalar(values)) {
                        if (values !== object[index]) {
                            localInside = false;
                        }
                    }
                    if (values instanceof Object && object[index] instanceof Object) {
                        for (let key in values) {
                            if (values.hasOwnProperty(key)) {
                                if (values[key] !== object[index][key]) {
                                    localInside = false;
                                    break;
                                }
                            }
                        }
                    }
                    if (localInside) {
                        result = index;
                        break;
                    }
                }
            }
        }
        return result;
    }

    extract (path, target = process, defaults = undefined) {
        path = path.split('.');
        while (path.length > 0) {
            let step = path.shift();
            if (!this.empty(target) && target.hasOwnProperty(step)) {
                target = target[step];
            } else {
                return defaults;
            }
        }
        return target;
    }

    flipObject (object) {
        let result = {};
        for (let key in object) {
            if (object.hasOwnProperty(key)) {
                result[ object[key] ] = key;
            }
        }
        return result;
    }

    random (min = 0, max = 1) {
        return Math.floor(min + Math.random() * Math.floor(max - min));
    }

    readConfig(content, binding = '$FILE ', first = false) {
        let schema = content;
        if (this.isString(content)) {
            if (first) {
                content = binding + content;
            }
            let bind = this.checkBinding(content, binding);
            if (bind.found) {
                schema = this.readConfigPart(bind.clear);
            }
        }
        if (schema instanceof Object) {
            for (let key in schema) {
                if (schema.hasOwnProperty(key)) {
                    schema[key] = this.readConfig(schema[key], binding);
                }
            }
        }
        return schema;
    }

    readConfigPart (configPath, charset = 'utf8') {
        let config = {};
        let ext = path.extname(configPath);
        let fullPath = path.resolve(configPath);
        switch (ext) {
            case '.yml':
                config = YAML.safeLoad(this.readFileSync(fullPath, charset));
                break;
            case '.json':
                try {
                    config = JSON.parse(this.readFileSync(fullPath, charset));
                } catch (e) {
                    config = {}
                }
                break;
            case '.js':
                config = require(configPath);
                break;
            default:
                break;
        }
        return config;
    }

    checkBinding (variable, binding) {
        let length = binding.length;
        let result = {
            found: false,
            binding: binding,
            length: length,
            clear: variable,
            full: variable,
        };
        if (!this.empty(variable)) {
            result.found = typeof variable === 'string' && variable.substring(0, length) === binding;
            if (result.found) {
                result.clear = variable.substring(length);
            }
        }
        return result;
    }


}

module.exports = MVTools;