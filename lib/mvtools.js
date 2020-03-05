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

    static readEnv () {
        dotenv.config();
    }

    static getHostname () {
        return os.hostname();
    }

    static relativePath (to, from = '') {
        if (from === '') {
            from = process.cwd();
        }
        return path.relative(from, to);
    }

    readFileSync (filename, charset = 'utf8') {
        return fs.readFileSync(filename, charset);
    }

    __merge (recursive, ...objects) {
        let object = {};
        for (let nObject of objects) {
            if (nObject === undefined || nObject === null) {
                continue;
            }
            if (Array.isArray(nObject)) {
                if (!Array.isArray(object)) {
                    object = [];
                }
                object = this.arrayUnique(object.concat(nObject));
            } else if (nObject instanceof Object) {
                for (let key in nObject) {
                    if (nObject.hasOwnProperty(key)) {
                        if (Array.isArray(nObject)) {
                            key = parseInt(key);
                        }
                        // console.log('KEY ' + key + ' TYPE ' + typeof key);
                        if (typeof nObject[key] !== 'function' && recursive && object[key] instanceof Object && nObject[key] instanceof Object ) {
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

    arrayUnique(array) {
        var a = array.concat();
        for (let i = 0; i < a.length; ++i) {
            for (let j = i + 1; j < a.length; ++j) {
                if (a[i] === a[j])
                    a.splice(j--, 1);
            }
        }
        return a;
    }

    arrayDiff (a, b) {
        return a.filter(function (i) {
            return b.indexOf(i) < 0;
        });
    };

    makeArray (a) {
        return Array.isArray(a) ? a : [a];
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
        if (!Array.isArray(path)) {
            if (this.isScalar(path)) {
                path = this.isString(path) ? path.split('.') : [path];
            } else {
                return defaults;
            }
        }
        while (path.length > 0) {
            let step = path.shift();
            if (!this.empty(target) && !this.isScalar(target) && step in target) {
                target = target[step];
            } else {
                return defaults;
            }
        }
        return target;
    }

    setByPath (path, target, value) {
        if (!Array.isArray(path)) {
            if (this.isScalar(path)) {
                path = this.isString(path) ? path.split('.') : [path];
            } else {
                return target;
            }
        }
        let step = path.shift();
        if (target instanceof Object && !(step in target)) {
            target[step] = {};
        } else if (!(target instanceof Object)) {
            return false;
        }
        if (path.length > 0) {
            let v = this.setByPath(path, target[step], value);
            if (v !== false) {
                target[step] = v;
            } else {
                return false;
            }
        } else {
            target[step] = value;
        }
        return target;
    }

    replaceAll (values, haystack) {
        if (arguments.length === 3) {
            values = {};
            values[arguments[0]] = arguments[1];
            haystack = arguments[2];
        }
        for (let key in values) {
            if (values.hasOwnProperty(key)) {
                haystack = haystack.split(key).join(values[key])
            }
        }
        return haystack;
    }

    replaceRecursive (values, object) {
        if (this.isString(object)) {
            object = this.replaceAll(values, object);
        } else if (Array.isArray(object) || typeof object === 'object') {
            for (let key in object) {
                if (object.hasOwnProperty(key)) {
                    if (Array.isArray(object[key]) || typeof object[key] === 'object') {
                        object[key] = this.replaceRecursive(values, object[key]);
                    } else {
                        object[key] = this.replaceAll(values, object[key]);
                    }
                }
            }
        }
        return object;
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

    copyObject (object) {
        let result = {};
        try {
            result = JSON.parse(JSON.stringify(object));
        } catch (e) {
            result = {};
        }
        return result;
    }

    random (min = 0, max = 1) {
        return Math.floor(min + Math.random() * Math.floor(max - min));
    }

    sleep (delay) {
        return new Promise(resolve => setTimeout(resolve, delay));
    }

    readConfig(content, binding = '$FILE ', path = '', first = false) {
        path = this.excludeFileFromPath(path);
        let schema = content;
        if (this.isString(content)) {
            if (first) {
                content = binding + content;
            }
            let bind = this.checkBinding(content, binding);
            if (bind.found) {
                schema = this.readConfigPart(bind.clear, path);
                path = bind.clear[0] !== '/' ? path + '/' + bind.clear : bind.clear;
            }
        }
        if (schema instanceof Object) {
            for (let key in schema) {
                if (schema.hasOwnProperty(key)) {
                    schema[key] = this.readConfig(schema[key], binding, path);
                }
            }
        }
        return schema;
    }

    readConfigPart (configPath, parentPath = '', charset = 'utf8') {
        let config = {};
        let ext = path.extname(configPath);
        if (!this.empty(parentPath)) {
            parentPath = path.resolve(parentPath);
            let stats = fs.statSync(parentPath);
            parentPath = stats.isFile() ? path.dirname(parentPath) : parentPath;
        }
        let fullPath = path.resolve(parentPath, configPath);
        if (fs.existsSync(fullPath)) {
            switch (ext) {
                case '.yml':
                    config = YAML.safeLoad(this.readFileSync(fullPath, charset));
                    if (config === undefined) {
                        console.error('FILE AT FULL PATH ' + fullPath + ' IS NOT CORRECT YAML FILE. SKIPPED.');
                        config = {};
                    }
                    break;
                case '.json':
                    try {
                        config = JSON.parse(this.readFileSync(fullPath, charset));
                    } catch (e) {
                        console.error('FILE AT FULL PATH ' + fullPath + ' IS NOT CORRECT JSON FILE. SKIPPED.');
                        config = {}
                    }
                    break;
                case '.js':
                    config = require(configPath);
                    break;
                default:
                    config = fs.readFileSync(fullPath);
                    break;
            }
        } else {
            console.error('FILE ' + configPath + ' AT FULL PATH ' + fullPath + ' NOT FOUND. SKIPPED.');
        }
        return config;
    }

    excludeFileFromPath (filepath) {
        // let filepath = file;
        if (!this.empty(filepath)) {
            filepath = path.resolve(filepath);
            let stats = fs.statSync(filepath);
            filepath = stats.isFile() ? path.dirname(filepath) : filepath;
        }
        return filepath;
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

    numberToHuman (number, space = '.', delimiter = ',') {
        return String(number).replace('.', '^^').replace(/(\d)(?=(\d\d\d)+([^\d]|$))/g, '$1.').replace('^^', ',')
    }

    numberFromHuman (number, space = '.', delimiter = ',') {
        return parseFloat(String(number).replace('', '').replace(',', '.'));
    }

    static verboseConsole (methods = []) {
        if (methods.length === 0) {
            methods = ['log', 'warn', 'error', 'info'];
        }
        methods.forEach(a => {
            let b = console[a];
            console[a] = (...c) => {
                try {
                    throw new Error
                } catch (d) {
                    b.apply(console, [d.stack.split('\n')[2].trim().substring(3).replace(__dirname, '').replace(/\s\(./, ' at ').replace(/\)/, ''), '\n', ...c])
                }
            }
        });
    }

}

module.exports = MVTools;