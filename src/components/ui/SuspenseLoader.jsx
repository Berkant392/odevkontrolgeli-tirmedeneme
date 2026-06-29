import React from 'react';
import { motion } from 'framer-motion';

const SuspenseLoader = () => {
    return (
        <div className="flex flex-col items-center justify-center min-h-[50vh] w-full gap-4">
            <motion.div 
                className="w-12 h-12 border-4 border-slate-200 border-t-primary rounded-full"
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
            />
            <motion.p 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.2 }}
                className="text-slate-500 font-bold text-sm tracking-wide animate-pulse"
            >
                Yükleniyor...
            </motion.p>
        </div>
    );
};

export default SuspenseLoader;
