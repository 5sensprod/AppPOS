// styles/dropdownStyles.js
export const DROPDOWN_STYLES = `
  @keyframes dropdownItemIn {
    from {
      opacity: 0;
      transform: translateY(-8px) scale(0.95);
    }
    to {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
  }

  @keyframes dropdownItemOut {
    from {
      opacity: 1;
      transform: translateY(0) scale(1);
    }
    to {
      opacity: 0;
      transform: translateY(8px) scale(0.95);
    }
  }
`;

export const injectDropdownStyles = (() => {
  let isInjected = false;
  return () => {
    if (!isInjected && typeof document !== 'undefined') {
      const styleElement = document.createElement('style');
      styleElement.innerHTML = DROPDOWN_STYLES;
      styleElement.setAttribute('data-dropdown-styles', 'true');
      document.head.appendChild(styleElement);
      isInjected = true;
      console.log('🎨 Styles de dropdown injectés');
    }
  };
})();
