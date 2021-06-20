/**
 * @file synchronous sleep and wait function
 *      jtSleep.js
 * @module ./jtSleep
 * @version 3.00.191023b
 * @author TANAHASHI, Jiro <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2019 jtLab, Hokkaido Information University
 */

 /**
  * synchronous sleep
  * @param {Number} ms - sleep time (milliseconds)
  */
function jtSleep(ms){
    return new Promise( (resolve) => {
        setTimeout( () => {
            resolve(true);
        }, ms);
    });
}

/**
 * synchronous wait using async/await
 * @param {number} timeout - wait timeout (milliseconds) if 0, wait terminate condition
 * @param {number} interval - condition check interval (milliseconds)
 * @param {Function} funcCondition - conditional expression (async function)
 * @param {Function} funcTerminate - call on timeout or terminater (async function)
 * @returns {boolean} - true: wait successed  - false: timeout or force terminated
 */
async function jtWait(
    timeout = 5000,
    interval = 10,
    funcCondition = async function(){return true;},
    funcTerminate = async function(){return}
){
    let timer = timeout;
    let watchdog = null;
    let condition = false;
    return new Promise( (resolve) => {
        watchdog = setInterval( async function(){
            condition = await funcCondition();
            if(condition){
                resolve(true);
            }
            if(timeout){
                timer = timer - interval;
                if(timer<0){
                    condition = await funcTerminate();
                    resolve(false);
                }
            }else{
                condition = await funcTerminate();
                if(condition){
                    resolve(false);
                }
            }
        }, interval);
    }).then( (result) => {
        clearInterval(watchdog);
        return result;
    });
}

/**
 * synchronous wait using Promise only
 * @param {number} timeout - wait timeout (milliseconds) if 0, wait terminate condition
 * @param {number} interval - condition check interval (milliseconds)
 * @param {Function} funcCondition - conditional expression (resolver function)
 * @param {Function} funcTerminate - call on timeout or terminater (resolver function)
 * @returns {Promise<boolean>} - true: wait successed  - false: timeout or force terminated
 */
function jtWait_Promise(
    timeout = 5000,
    interval = 10,
    funcCondition = function(resolve){ resolve(true); },
    funcTerminate = function(resolve){ resolve(); }
){
    let timer = timeout;
    let watchdog = null;
    let condition = false;
    return new Promise( (resolve) => {
        watchdog = setInterval( function(){
            new Promise( (resolve) => funcCondition(resolve) )
            .then( (condition) => {
                if(condition === true){
                    resolve(true);
                }
                if(timeout){
                    timer = timer - interval;
                    if(timer<0){
                        new Promise( (resolve) => funcTerminate(resolve) )
                        .then( () => {
                            resolve(false);
                        });
                    }
                }else{
                    new Promise( (resolve) => funcTerminate(resolve) )
                    .then( ( condition ) => {
                        if(condition === true){
                            resolve(false);
                        }
                    });
                }
            });
        }, interval);
    }).then( (result) => {
        clearInterval(watchdog);
        return result;
    });
}

/*

//usage: a sample in async function
async function jtSleepInAsyncFunctionSample(){
    console.log('0');
    await jtSleep(1000);
    console.log('1');
    await jtSleep(1000);
    console.log('2');
    await jtSleep(1000);
}

//usage: a sample with Promise
function jtSleepWithPromiseSample(){
    console.log('3');
    jtSleep(1000)
    .then( () => {
        console.log('4');
        return jtSleep(1000);
    }).then( () => {
        console.log('5');
        return jtSleep(1000);
    });
}

//usage: jtWait
//       if you want to use jtWait_Promise with async/await,
//       please change callback functions in arguments
//       to `function(resolve){ resolve(result); }`
let cond = false;
let terminater = false;
async function jtWaitSample(){
    let result = false;

    // with timeout
    console.log('test begin: will timeout after 5 sec.');
    result = await jtWait(5000, 10, async function(){
        return cond;
    });
    console.log('test end:', result);

    console.log('test begin: will success after 3 sec. with timeout');
    flipper();
    result = await jtWait(5000, 10, async function(){
        return cond;
    });
    console.log('test end:', result);

    // without timeout
    console.log('test begin: will success after 3 sec. without timeout');
    flipper();
    result = await jtWait(0, 10, async function(){
        return cond;
    }, async function(){
        return terminater;
    });
    console.log('test end:', result);

    console.log('test begin: comming terminater after 5 sec.');
    terminate();
    result = await jtWait(0, 10, async function(){
        return cond;
    }, async function(){
        return terminater;
    });
    console.log('test end:', result);
}
async function flipper(){
    cond = false;
    console.log('condition false');
    await jtSleep(3000);
    cond = true;
    console.log('condition true');
}
async function terminate(){
    cond = false;
    console.log('condition false');
    await jtSleep(5000);
    console.log('terminater is comming');
    terminater = true;
}

//usage: jtWait_Promise (full-Promisenized)
cond = false;
terminater = false;
function jtWait_PromiseSample(){
    // with timeout
    console.log('test begin: will timeout after 5 sec.');
    jtWait_Promise(5000, 10, function(resolve){
        resolve(cond);
    }).then( (result) => {
        console.log('test end:', result);

        console.log('test begin: will success after 3 sec. with timeout');
        flipper_Promise();  // async
        jtWait_Promise(5000, 10, function(resolve){
            resolve(cond);
        }).then( (result) => {
            console.log('test end:', result);

            // without timeout
            console.log('test begin: will success after 3 sec. without timeout');
            flipper_Promise();  // async
            jtWait_Promise(0, 10, function(resolve){
                resolve(cond);
            }, function(resolve){
                resolve(terminater);
            }).then( (result) => {
                console.log('test end:', result);

                console.log('test begin: comming terminater after 5 sec.');
                terminate_Promise();    // async
                jtWait_Promise(0, 10, function(resolve){
                    resolve(cond);
                }, function(resolve){
                    resolve(terminater);
                }).then( (result) => {
                    console.log('test end:', result);
                });
            });
        });
    });
}
function flipper_Promise(){
    return new Promise( (resolve) => {
        cond = false;
        console.log('condition false');
        jtSleep(3000).then( () => {
            cond = true;
            console.log('condition true');
            resolve();
        });
    });
}
function terminate_Promise(){
    return new Promise( (resolve) => {
        cond = false;
        console.log('condition false');
        jtSleep(5000).then( () => {
            console.log('terminater is comming');
            terminater = true;
            resolve();
        });
    });
}

//jtSleepInAsyncFunctionSample();
//jtSleepWithPromiseSample();
//jtWaitSample();
//jtWait_PromiseSample();

*/

module.exports = jtSleep;
module.exports.wait = jtWait;
module.exports.waitPromise = jtWait_Promise;
