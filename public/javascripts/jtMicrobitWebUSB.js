async function connect(){
    const usbDevice = await navigator.usb.requestDevice(
        {'filters': [ {vendorId: 0x0d28, productId: 0x0204}, ]
    }).catch(e => {
        console.log("Faild to connect.");
    });

    const configBytecode = new Uint8Array([0x82, 0x00, 0xc2, 0x01, 0x00]);
    const readBytecode = new Uint8Array([0x83, 0x04]);
    console.log(usbDevice.configurations);

    await usbDevice.open();
    await usbDevice.selectConfiguration(1);
    await usbDevice.claimInterface(4);
    console.log(await usbDevice.transferOut(4, configBytecode));
    console.log(await usbDevice.transferOut(4, readBytecode));
    console.log(await usbDevice.transferOut(4, readBytecode));
    console.log(await usbDevice.transferOut(4, readBytecode));
    console.log(await usbDevice.transferOut(4, readBytecode));
    console.log(await usbDevice.transferOut(4, readBytecode));
}