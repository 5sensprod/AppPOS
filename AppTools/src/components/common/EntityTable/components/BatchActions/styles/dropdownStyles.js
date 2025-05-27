// styles/dropdownStyles.js
export const DROPDOWN_STYLES = `
  @keyframes dropdownItemIn {
    from {
      opacity: 0;
      transform: translateY(-5px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes dropdownItemOut {
    from {
      opacity: 1;
      transform: translateY(0);
    }
    to {
      opacity: 0;
      transform: translateY(-5px);
    }
  }
`;

export const injectDropdownStyles = (() => {
  let isInjected = false;
  return () => {
    if (!isInjected && typeof document !== 'undefined') {
      const styleElement = document.createElement('style');
      styleElement.innerHTML = DROPDOWN_STYLES;
      document.head.appendChild(styleElement);
      isInjected = true;
    }
  };
})();
