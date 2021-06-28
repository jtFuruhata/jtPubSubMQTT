/**
 * @file micro:bit I/O module via WebUSB
 *      jtMicrobitWebUSB.js
 * @module ./jtMicrobitWebUSB
 * @version 0.01.210627a
 * @author TANAHASHI, Jiro (aka jtFuruhata) <jt@do-johodai.ac.jp>
 * @license MIT (see 'LICENSE' file)
 * @copyright (C) 2021 jtLab, Hokkaido Information University
 */

class MicrobitWebUSB {
    constructor(){
        this.usbDevice = {};
    }

    async connect(){
        let result = false;

        this.usbDevice = await navigator.usb.requestDevice(
            {'filters': [ {vendorId: 0x0d28, productId: 0x0204}, ]
        }).catch(e => {});

        if (this.usbDevice !== undefined) {
            await this.usbDevice.open();
            if (this.usbDevice.configuration === null){
                await this.usbDevice.selectConfiguration(1);
            }
            await this.usbDevice.claimInterface(4);
            result = true;
        }

        return result;
        //await read();
    }

    async read(){
        // send DAP UART read command 
        let result = await this.usbDevice.controlTransferOut(
            {
                requestType: "class",
                recipient: "interface",
                request: 0x09,
                value: 0x200,
                index: 4
            },
            new Uint8Array([0x83])
        );

        if (result.status == 'ok') {
            // read from UART buffer
            result = await this.usbDevice.controlTransferIn(
                {
                    requestType: "class",
                    recipient: "interface",
                    request: 0x01,
                    value: 0x100,
                    index: 4
                },
                32
            );
        }
        result.text = "";
        result.booleanStatus = false;
        result.length = -1;

        if (result.status == 'ok') {
            let buffer = new Uint8Array(result.data.buffer);
            result.booleanStatus = true;
            result.length = buffer[1];
            if (buffer[0] == 0x83 && result.length > 0) {
                buffer = buffer.slice(2, result.length+2);
                result.text = new TextDecoder().decode(buffer);
            }
        }

        return result;
        //setTimeout(read, 100);
    }
}

async function connect(){
    const browserConsole = document.getElementById("browserConsole");
    const microbit = new MicrobitWebUSB();
    const xmlHttpRequest = new XMLHttpRequest();
    const READYSTATE_COMPLETED = 4;
    const HTTP_STATUS_OK = 200;

    xmlHttpRequest.onreadystatechange = function(){
        if( this.readyState == READYSTATE_COMPLETED
         && this.status == HTTP_STATUS_OK ) {
            browserConsole.innerHTML += "response:" + this.responseText + "<br>";
        }
    }

    if(await microbit.connect()){
        browserConsole.innerHTML = "micro:bitに接続しました。<br>";
        setInterval( async () => {
            let result = await microbit.read();
            if(result.length > 0){
                xmlHttpRequest.open("POST", "/api/temperature");
                xmlHttpRequest.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
                xmlHttpRequest.send(`data=${result.text}`);
            }
        }, 100);
    }else{
        browserConsole.innerText = "micro:bitとの接続に失敗しました。<br>";
    }
}

// サーバに対して解析方法を指定する

// データをリクエスト ボディに含めて送信する
