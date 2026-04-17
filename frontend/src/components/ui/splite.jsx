import { Suspense, lazy, useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const Spline = lazy(() => import('@splinetool/react-spline'))

function SplineLoader() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-4">
        {/* Orbital ring loader */}
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border border-[#00D4C8]/10" />
          <div className="absolute inset-0 rounded-full border-t border-r border-[#00D4C8]/60 animate-spin" style={{ animationDuration: '1.2s' }} />
          <div className="absolute inset-[6px] rounded-full border border-[#00D4C8]/8" />
          <div className="absolute inset-[6px] rounded-full border-t border-[#00D4C8]/30 animate-spin" style={{ animationDuration: '2s', animationDirection: 'reverse' }} />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-2 h-2 rounded-full bg-[#00D4C8]/60 animate-pulse" />
          </div>
        </div>
        <p className="text-[#00D4C8]/50 text-[10px] uppercase tracking-[0.2em] font-semibold">
          Initialising Anton
        </p>
      </div>
    </div>
  )
}

export function SplineScene({ scene, className }) {
  const [loaded, setLoaded] = useState(false)
  const handleLoad = useCallback(() => setLoaded(true), [])

  return (
    <div className={`relative ${className}`} style={{ minHeight: '300px' }}>
      {/* Loading state — fades out once scene is ready */}
      <AnimatePresence>
        {!loaded && (
          <motion.div
            key="loader"
            className="absolute inset-0 z-10"
            initial={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.6, ease: 'easeOut' } }}
          >
            <SplineLoader />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Spline scene — fades in when ready */}
      <Suspense fallback={null}>
        <motion.div
          className="w-full h-full"
          initial={{ opacity: 0 }}
          animate={{ opacity: loaded ? 1 : 0 }}
          transition={{ duration: 0.8, ease: 'easeOut' }}
        >
          <Spline
            scene={scene}
            onLoad={handleLoad}
            className="w-full h-full"
          />
        </motion.div>
      </Suspense>
    </div>
  )
}
