export function setWindowSize(width: number, height: number) {
    // @ts-expect-error Not readonly in test env
    window.innerWidth = width;
    // @ts-expect-error Not readonly in test env
    window.innerHeight = height;
    const resizeEvent = document.createEvent('Event');
    // Use of deprecated method from https://gist.github.com/javierarques/d95948ac7e9ddc8097612866ecc63a4b
    // needed to simulate resize event
    resizeEvent.initEvent('resize', true, true);
    document.dispatchEvent(resizeEvent);
}
