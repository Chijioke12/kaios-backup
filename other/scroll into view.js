function scrollToCenter(element, container) {
    // 1. Get the top position of the element relative to the container
    var elementTop = element.offsetTop;
    
    // 2. Get the dimensions
    var elementHeight = element.offsetHeight;
    var containerHeight = container.clientHeight;

    // 3. The Math:
    // elementTop: puts the item at the very top of the container.
    // - (containerHeight / 2): moves the scroll point up by half the container height (centering the view).
    // + (elementHeight / 2): adjusts for the item's own height so its center aligns with the container's center.
    var targetScrollPos = elementTop - (containerHeight / 2) + (elementHeight / 2);

    // 4. Apply the scroll position to the container
    container.scrollTop = targetScrollPos;
}