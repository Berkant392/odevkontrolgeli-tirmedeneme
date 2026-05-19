import React from 'react';
import { StickyNote } from 'lucide-react';
import { STATUS_OPTIONS } from '../../utils/constants';

const StatusBadge = ({ status, hasNote }) => {
    const opt = STATUS_OPTIONS.find(o => o.id === status) || STATUS_OPTIONS[3]; 
    return ( 
        <div className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border-2 ${opt.bg} ${opt.color} ${opt.border} w-full shadow-sm relative group hover:shadow-md transition-all duration-200`}>
            <opt.icon size={16} strokeWidth={2.5} />
            <span className="text-[11px] font-black tracking-wide uppercase truncate">{opt.label}</span>
            {hasNote && <div className="absolute -top-2 -right-2 text-white bg-amber-500 rounded-full p-1 shadow-md border-2 border-white animate-bounce-slight"><StickyNote size={10} fill="currentColor"/></div>}
        </div> 
    );
};

export default StatusBadge;
