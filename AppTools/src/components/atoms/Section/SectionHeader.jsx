// src/components/atoms/Section/SectionHeader.jsx
import React from 'react';
import {
  getSectionHeaderClassName,
  getSubHeaderClassName,
  getHeaderContainerClassName,
  getIconClassName,
} from './sectionStyles';

export const SectionHeader = ({ icon: Icon, title, level = 2, size = 'md', className = '' }) => {
  const isMainHeader = level === 2;
  const headerClassName = isMainHeader ? getSectionHeaderClassName(size) : getSubHeaderClassName();
  const iconClassName = getIconClassName(isMainHeader ? 'main' : 'sub');

  const HeaderTag = `h${level}`;

  return (
    <HeaderTag className={`${headerClassName} ${className}`.trim()}>
      <div className={getHeaderContainerClassName()}>
        {Icon && <Icon className={iconClassName} />}
        <span>{title}</span>
      </div>
    </HeaderTag>
  );
};

export const SubHeader = ({ icon: Icon, title, className = '' }) => {
  return <SectionHeader icon={Icon} title={title} level={3} className={className} />;
};

export default SectionHeader;
