import React, { ReactNode } from 'react';
import { ChevronDown, ChevronRight } from 'lucide-react';

interface AccordionSectionProps {
    title: string;
    icon?: React.ElementType;
    isOpen: boolean;
    onToggle: () => void;
    children: ReactNode;
    defaultOpen?: boolean;
}

const AccordionSection: React.FC<AccordionSectionProps> = ({
    title,
    icon: Icon,
    isOpen,
    onToggle,
    children,
}) => {
    return (
        <div className="accordion-section">
            <button
                className="accordion-header"
                onClick={onToggle}
            >
                <div className="accordion-header-content">
                    {Icon && <Icon className="accordion-icon" size={16} />}
                    <span className="accordion-title">{title}</span>
                </div>
                {isOpen ? (
                    <ChevronDown className="accordion-chevron" size={16} />
                ) : (
                    <ChevronRight className="accordion-chevron" size={16} />
                )}
            </button>
            {isOpen && (
                <div className="accordion-content">
                    {children}
                </div>
            )}
        </div>
    );
};

export default AccordionSection;

