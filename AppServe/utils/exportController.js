function exportControllerMethods(controller, methods) {
  return methods.reduce((acc, method) => {
    if (typeof controller[method] === 'function') {
      acc[method] = controller[method].bind(controller);
    } else {
      acc[method] = controller[method]; // ex: uploadImage qui n'est pas une fonction directement dans SupplierController
    }
    return acc;
  }, {});
}

module.exports = exportControllerMethods;
