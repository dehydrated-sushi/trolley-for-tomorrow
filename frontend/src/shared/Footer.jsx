export default function Footer() {
  return (
    <footer className="w-full py-12 px-6 mt-auto bg-emerald-900 text-emerald-50">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-emerald-800/30 pt-8 gap-8">
        <div className="text-center md:text-left">
          <span className="font-black text-emerald-100 font-headline tracking-tight text-xl">The Living Larder</span>
          <p className="text-xs uppercase tracking-widest text-emerald-400 mt-2">
            &copy; 2024 The Living Larder. Nurturing Australian Kitchens.
          </p>
        </div>
        <div className="flex flex-wrap justify-center gap-8 text-xs uppercase tracking-widest">
          <a className="text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Privacy Policy</a>
          <a className="text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Support</a>
          <a className="text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Feedback</a>
          <a className="text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Community Guidelines</a>
        </div>
      </div>
    </footer>
  )
}
