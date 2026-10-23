export function setWindowSize(width: number, height: number) {
    window.innerWidth = width;
    window.innerHeight = height;
    window.dispatchEvent(new Event("resize"));
}
