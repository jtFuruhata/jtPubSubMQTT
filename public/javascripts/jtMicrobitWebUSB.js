var usbDevice = {};
var browserConsole = {};

async function connect(){
    browserConsole = document.getElementById("browserConsole");
    let result = null;

    usbDevice = await navigator.usb.requestDevice(
        {'filters': [ {vendorId: 0x0d28, productId: 0x0204}, ]
    }).catch(e => {
        browserConsole.innerText = "micro:bitとの接続に失敗しました。<br>";
    });

    if (usbDevice !== undefined) {
        await usbDevice.open();
        await usbDevice.selectConfiguration(1);
        await usbDevice.claimInterface(4);
        browserConsole.innerHTML = "micro:bitに接続しました。<br>";
    }

    await read();
}

async function read(){
    // send DAP UART read command 
    result = await usbDevice.controlTransferOut(
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
        result = await usbDevice.controlTransferIn(
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

    if (result.status == 'ok') {
        let buffer = new Uint8Array(result.data.buffer);
        console.log(buffer);
        if (buffer[0] == 0x83 && buffer[1] > 0) {
            buffer = buffer.slice(2, buffer[1]+2);
            browserConsole.innerHTML += new TextDecoder().decode(buffer) + "<br>";
        }
    }

    setTimeout(read, 100);
}