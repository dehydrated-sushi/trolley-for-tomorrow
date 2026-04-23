import { useEffect } from 'react'
import { motion, useMotionValue, useTransform, animate } from 'framer-motion'

/**
 * Tweens a number from its current displayed value to `value` over
 * `duration` seconds. Uses framer-motion's MotionValue / useTransform
 * pipeline so per-frame updates bypass React reconciliation — the
 * counter renders smoothly without causing parent re-renders.
 *
 * `format` is applied to each frame's value before it's rendered.
 * Defaults to rounding to an integer; override for currency, percent,
 * decimals, etc.
 *
 * On `value` change the tween restarts from the current displayed
 * value (not zero), so repeat data refreshes animate cleanly between
 * real values instead of flashing back to 0.
 */
export default function AnimatedNumber({
  value = 0,
  duration = 1.1,
  format = (n) => Math.round(n),
}) {
  const raw = useMotionValue(0)
  const display = useTransform(raw, format)

  useEffect(() => {
    const controls = animate(raw, value, {
      duration,
      ease: [0.22, 1, 0.36, 1],
    })
    return controls.stop
  }, [value, duration, raw])

  return <motion.span>{display}</motion.span>
}
