import { useState } from 'react'
import PrivacyPolicyModal from './PrivacyPolicyModal'
import MadeByModal from './MadeByModal'

export default function Footer() {
  const [privacyOpen, setPrivacyOpen] = useState(false)
  const [madeByOpen, setMadeByOpen] = useState(false)

  return (
    <>
      <footer className="w-full py-12 px-6 mt-auto bg-emerald-900 text-emerald-50">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-emerald-800/30 pt-8 gap-8">
          <div className="text-center md:text-left">
            <span className="font-black text-emerald-100 font-headline tracking-tight text-xl">Trolley for Tomorrow</span>
            <p className="text-xs uppercase tracking-widest text-emerald-400 mt-2">
              &copy; 2026 Trolley for Tomorrow · Monash FIT5120 student project
            </p>
          </div>
          <div className="flex flex-wrap justify-center gap-8 text-xs uppercase tracking-widest">
            <button
              type="button"
              onClick={() => setPrivacyOpen(true)}
              className="text-emerald-400 hover:text-emerald-100 transition-opacity cursor-pointer uppercase tracking-widest bg-transparent border-0 p-0"
            >
              Privacy Policy
            </button>
            <a
              className="text-emerald-400 hover:text-emerald-100 transition-opacity"
              href="https://forms.gle/gBfeEqRoa2Qx9X69A"
              target="_blank"
              rel="noopener noreferrer"
            >
              Feedback
            </a>
            <button
              type="button"
              onClick={() => setMadeByOpen(true)}
              className="text-emerald-400 hover:text-emerald-100 transition-opacity cursor-pointer uppercase tracking-widest bg-transparent border-0 p-0"
            >
              Made by
            </button>
          </div>
        </div>
      </footer>
      <PrivacyPolicyModal open={privacyOpen} onClose={() => setPrivacyOpen(false)} />
      <MadeByModal open={madeByOpen} onClose={() => setMadeByOpen(false)} />
    </>
  )
}
