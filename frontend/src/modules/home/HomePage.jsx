import { Link } from 'react-router-dom'

export default function HomePage() {
  return (
    <>
      {/* TopNavBar */}
      <nav className="fixed top-0 w-full z-50 glass-nav shadow-sm">
        <div className="flex justify-between items-center px-6 py-3 max-w-7xl mx-auto">
          <div className="flex items-center gap-8">
            <span className="text-xl font-bold text-emerald-900 tracking-tight">The Living Larder</span>
            <div className="hidden md:flex gap-6 items-center">
              <Link className="text-emerald-700 border-b-2 border-emerald-600 font-semibold px-1 py-1 transition-all duration-300" to="/dashboard">Dashboard</Link>
              <Link className="text-emerald-600/70 hover:text-emerald-800 transition-all duration-300 px-1 py-1" to="/fridge">Virtual Fridge</Link>
              <Link className="text-emerald-600/70 hover:text-emerald-800 transition-all duration-300 px-1 py-1" to="/meals">Meal Plans</Link>
              <Link className="text-emerald-600/70 hover:text-emerald-800 transition-all duration-300 px-1 py-1" to="/shopping">Shopping List</Link>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="relative hidden sm:block">
              <input className="bg-surface-container-low border-none rounded-full px-4 py-2 text-sm focus:ring-2 focus:ring-primary transition-all w-64" placeholder="Search recipes..." type="text" />
            </div>
            <Link to="/profile" className="material-symbols-outlined text-emerald-800 p-2 hover:bg-emerald-100/50 rounded-lg transition-all">account_circle</Link>
          </div>
        </div>
      </nav>

      <main className="pt-16">
        {/* Hero Section */}
        <section className="relative min-h-[870px] flex items-center overflow-hidden bg-[#0c1f14]">
          <div className="absolute inset-0 opacity-40 mix-blend-overlay">
            <img className="w-full h-full object-cover" alt="moody close-up of fresh organic leafy greens and herbs on a dark rustic kitchen counter with dramatic sunlight" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBBWuaA-4fulG06Tz8q33VpG975SAaEy0vq2NT32ymngAwGpktDFNN9eYXmIGUwkYfKYkL-7RVUZADwVBxpxaABu8ACDJ_FqJIb_z2tZ5L8N3DbG3ceV7f5Ek4LDN35MI5uUCCjHTq4OEYF_Vz_5HUK_rf583XrJDZKxyi1TT7QaINAcxA3-YzGltvpjKGa2MHDh5l3oaRGYoP1jGvumGjblNDUQmtozZlDTMI956fopg4MJYcCke0UEXGzixc4i0og3FCcHYiyP7g" />
          </div>
          <div className="relative z-10 max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="space-y-8">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-fixed border border-primary/30">
                <span className="material-symbols-outlined text-sm">eco</span>
                <span className="text-xs font-medium uppercase tracking-widest">Trolly for Tomorrow</span>
              </div>
              <h1 className="text-5xl md:text-7xl font-extrabold text-on-primary leading-[1.1] tracking-tight">
                Nurturing <span className="text-primary-container">Australian</span> Kitchens.
              </h1>
              <p className="text-xl text-surface-variant max-w-lg leading-relaxed">
                Transform your shopping list into a sustainable meal ecosystem. Reduce waste, save money, and cook with purpose.
              </p>
              <div className="flex flex-wrap gap-4">
                <Link to="/signup" className="px-8 py-4 bg-gradient-to-br from-primary to-primary-container text-on-primary rounded-full font-bold text-lg shadow-xl shadow-primary/20 hover:scale-105 active:scale-95 transition-all">
                  Start My Larder
                </Link>
                <button className="px-8 py-4 bg-surface-container-highest/10 backdrop-blur-md border border-surface-variant/20 text-on-primary rounded-full font-bold text-lg hover:bg-surface-container-highest/20 transition-all">
                  See How It Works
                </button>
              </div>
            </div>
            {/* Hero Interactive Demo Card */}
            <div className="hidden lg:block relative">
              <div className="bg-surface-container-lowest rounded-3xl p-8 shadow-2xl relative z-10">
                <div className="flex justify-between items-center mb-8">
                  <h3 className="text-xl font-bold text-emerald-900">Live Inventory</h3>
                  <span className="text-xs font-semibold text-emerald-600 bg-emerald-50 px-2 py-1 rounded-md tracking-tighter">SYDNEY METRO</span>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-700">egg</span>
                      </div>
                      <div>
                        <p className="font-bold text-emerald-900">Organic Eggs</p>
                        <p className="text-xs text-emerald-600">Expires in 3 days</p>
                      </div>
                    </div>
                    <span className="text-primary font-bold">6 left</span>
                  </div>
                  <div className="flex items-center justify-between p-4 bg-surface-container-low rounded-2xl">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-emerald-100 rounded-xl flex items-center justify-center">
                        <span className="material-symbols-outlined text-emerald-700">restaurant</span>
                      </div>
                      <div>
                        <p className="font-bold text-emerald-900">Spinach Bunch</p>
                        <p className="text-xs text-tertiary">Use today</p>
                      </div>
                    </div>
                    <span className="text-tertiary font-bold">1 pack</span>
                  </div>
                </div>
                <div className="mt-8 pt-6 border-t border-emerald-100">
                  <p className="text-sm font-medium text-emerald-800 mb-4">Suggested Recipe:</p>
                  <div className="flex gap-4 p-3 bg-primary-container/10 rounded-2xl border border-primary-container/20">
                    <img className="w-20 h-20 rounded-xl object-cover" alt="vibrant green spinach omelette served on a white ceramic plate with a side of sourdough toast" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBNzsqR-sv62j7OlGFNNZm9AaHRJ2JAx7HXN2VzMJtZudsdRD0u1E3SOSZhw1LB3QfKx5k6esUUsdE_OxVNHvrFu_VorF2MXlZioyCaHwkgehzlmaQztMYk7W9vRLlO2Do4_U2T6ASjHzUUzEuTNBSN7CHgVi2obHogZm-zIatCiiZ6gWCG4uzqtKx2eYJxk6NO8giNydD3d4OOd8hEEVSwx4JqXsPzmQVjcof00sVOZhsWZue8Vx2A2QL1vTfbKnbAeAtbe5bCCS8" />
                    <div>
                      <p className="font-bold text-emerald-900">Waste-Free Omelette</p>
                      <p className="text-xs text-emerald-700">Uses 2 fading ingredients</p>
                      <div className="flex gap-1 mt-2">
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-emerald-100">15 mins</span>
                        <span className="text-[10px] bg-white px-2 py-0.5 rounded-full border border-emerald-100">Easy</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
              {/* Decorative Background Blobs */}
              <div className="absolute -top-10 -right-10 w-64 h-64 bg-primary/20 rounded-full blur-3xl -z-0"></div>
              <div className="absolute -bottom-10 -left-10 w-48 h-48 bg-primary-container/30 rounded-full blur-3xl -z-0"></div>
            </div>
          </div>
        </section>

        {/* Feature Showcase Grid */}
        <section className="py-24 px-6 max-w-7xl mx-auto">
          <div className="mb-16">
            <h2 className="text-4xl font-extrabold text-emerald-900 mb-4 tracking-tight">Designed for Modern Households</h2>
            <p className="text-emerald-700/70 max-w-2xl text-lg">Intelligent tools that adapt to your pantry, your budget, and your taste. No more spreadsheets, just soulful cooking.</p>
          </div>
          {/* Bento Grid Layout */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Large Card */}
            <div className="md:col-span-2 bg-surface-container rounded-[2rem] overflow-hidden group">
              <div className="p-10 flex flex-col h-full justify-between">
                <div className="max-w-md">
                  <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                    <span className="material-symbols-outlined text-primary">kitchen</span>
                  </div>
                  <h3 className="text-3xl font-bold text-emerald-950 mb-4 leading-tight">The Virtual Fridge</h3>
                  <p className="text-emerald-800/80 leading-relaxed">Stop double-buying. Scan your receipts and our AI instantly categorizes your perishables, tracking expiry dates and suggesting meals before ingredients go to waste.</p>
                </div>
                <div className="mt-12 -mx-10 -mb-10">
                  <img className="w-full h-64 object-cover object-center group-hover:scale-105 transition-transform duration-500" alt="modern minimalist kitchen interior with a organized refrigerator stocked with fresh vegetables and glass containers" src="https://lh3.googleusercontent.com/aida-public/AB6AXuA73jFJbQQAXfc9BWa6Si2pE_Acmn3gXuA79Jh-WYuHzg-jGxfzItyjeic0thNsN89QkUxZ9_AcGfHN8o5R0FmpVHWAEFlCwbx-MxOMTw8uYG8naLOKGJl7wbQCGj4yA1_eQLcba9SGwIXDrloakx9cHVv0RNdN5vkTsEc7tJeMIhNxQtFYKu93YjHI8UgQh-lrPJP8RIbjgSwah-4oM8zh0j2mwzY3BMqUW-xPXT5C8G_h7SWe1LBHmE3m4s_PDIob5-rI6ju-Ayg" />
                </div>
              </div>
            </div>
            {/* Tall Card */}
            <div className="bg-primary text-on-primary rounded-[2rem] p-10 flex flex-col justify-between">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center mb-6 border border-white/20">
                  <span className="material-symbols-outlined text-white">receipt_long</span>
                </div>
                <h3 className="text-2xl font-bold mb-4">Smart Receipt Parsing</h3>
                <p className="text-white/80 leading-relaxed">Automatically extract item prices and quantities from any Australian supermarket receipt. Watch your savings grow in real-time.</p>
              </div>
              <div className="mt-12 bg-white/10 p-6 rounded-2xl border border-white/20">
                <div className="flex justify-between text-sm mb-2">
                  <span>Weekly Target</span>
                  <span>$120.00</span>
                </div>
                <div className="w-full bg-white/20 h-2 rounded-full overflow-hidden">
                  <div className="bg-primary-container h-full w-3/4"></div>
                </div>
                <p className="text-[10px] mt-4 opacity-60">75% OF BUDGET USED</p>
              </div>
            </div>
            {/* Small Card 1 */}
            <div className="bg-surface-container-low rounded-[2rem] p-10 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-tertiary">savings</span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3">Budget Benchmarks</h3>
              <p className="text-emerald-800/70 text-sm leading-relaxed">Compare your grocery spend against similar Australian households to find hidden savings.</p>
            </div>
            {/* Small Card 2 */}
            <div className="bg-surface-container-low rounded-[2rem] p-10 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-primary">restaurant_menu</span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3">Meal Planning</h3>
              <p className="text-emerald-800/70 text-sm leading-relaxed">Generate 7-day meal plans based strictly on what's already in your pantry and fridge.</p>
            </div>
            {/* Small Card 3 */}
            <div className="bg-surface-container-low rounded-[2rem] p-10 hover:shadow-xl transition-all duration-300">
              <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center mb-6 shadow-sm">
                <span className="material-symbols-outlined text-primary">group</span>
              </div>
              <h3 className="text-xl font-bold text-emerald-950 mb-3">Community Insights</h3>
              <p className="text-emerald-800/70 text-sm leading-relaxed">Share tips on local specials and bulk-buy opportunities with your neighborhood.</p>
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-24 px-6">
          <div className="max-w-5xl mx-auto bg-[#0c1f14] rounded-[3rem] p-12 md:p-20 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-primary/20 rounded-full blur-3xl"></div>
            <div className="relative z-10">
              <h2 className="text-4xl md:text-5xl font-extrabold text-white mb-6 leading-tight">Ready to nurture your kitchen?</h2>
              <p className="text-white/70 text-lg mb-10 max-w-xl mx-auto">Join 15,000+ Australian households making smarter, more sustainable food choices every day.</p>
              <Link to="/signup" className="inline-block px-10 py-5 bg-primary-container text-on-primary-container rounded-full font-black text-xl hover:scale-105 active:scale-95 transition-all">
                Join The Living Larder
              </Link>
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-emerald-900 w-full py-12 px-6 mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row justify-between items-center border-t border-emerald-800/30 pt-8">
          <div className="mb-6 md:mb-0">
            <span className="font-black text-emerald-100 text-xl tracking-tighter">The Living Larder</span>
            <p className="text-xs uppercase tracking-widest text-emerald-400 mt-2">&copy; 2024 The Living Larder. Nurturing Australian Kitchens.</p>
          </div>
          <div className="flex flex-wrap justify-center gap-8">
            <a className="text-xs uppercase tracking-widest text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Privacy Policy</a>
            <a className="text-xs uppercase tracking-widest text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Support</a>
            <a className="text-xs uppercase tracking-widest text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Feedback</a>
            <a className="text-xs uppercase tracking-widest text-emerald-400 hover:text-emerald-100 transition-opacity" href="#">Community Guidelines</a>
          </div>
        </div>
      </footer>

      {/* FAB for quick action */}
      <Link to="/meals" className="fixed bottom-8 right-8 w-16 h-16 bg-primary text-white rounded-2xl shadow-2xl flex items-center justify-center hover:scale-110 active:scale-90 transition-all z-40 group">
        <span className="material-symbols-outlined text-3xl">add_shopping_cart</span>
        <span className="absolute right-full mr-4 px-3 py-1 bg-white text-emerald-900 text-sm font-bold rounded-lg shadow-sm opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap">Plan Weekly Meals</span>
      </Link>
    </>
  )
}
