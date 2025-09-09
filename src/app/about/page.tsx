import Link from 'next/link'

export default function About() {
  return (
    <div className="min-h-screen bg-black text-white">
      <header className="bg-gray-900 border-b border-gray-800 py-6">
        <div className="container mx-auto px-4 flex justify-between items-center">
          <Link href="/" className="text-2xl font-bold text-white hover:text-gray-300 transition-colors">
            Missing Persons Awareness
          </Link>
          <nav className="flex gap-6">
            <Link href="/" className="text-gray-300 hover:text-white transition-colors">
              Home
            </Link>
            <Link href="/about" className="text-white font-semibold">
              About
            </Link>
            <Link href="/analysis" className="text-gray-300 hover:text-white transition-colors">
              AI Analysis
            </Link>
          </nav>
        </div>
      </header>

      <main className="container mx-auto px-4 py-12">
        <div className="max-w-4xl mx-auto">
          {/* Hero Section */}
          <section className="text-center mb-16">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">
              <span className="text-white">About</span>{' '}
              <span className="text-red-500">SaveThemNow.Jesus</span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-300 max-w-3xl mx-auto leading-relaxed">
              A platform dedicated to raising awareness about missing persons across the United States
              and helping bring them home.
            </p>
          </section>

          {/* Mission Section */}
          <section className="mb-16">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
              <h2 className="text-3xl font-bold text-white mb-6">Our Mission</h2>
              <p className="text-lg text-gray-300 leading-relaxed mb-6">
                Every person who goes missing leaves behind a family searching for answers, a community 
                that has lost someone precious. SaveThemNow.Jesus exists to ensure that no missing person 
                is forgotten and that their stories continue to be told until they are found.
              </p>
              <p className="text-lg text-gray-300 leading-relaxed">
                Through technology, data visualization, and community awareness, we aim to keep missing 
                persons cases in the public eye and provide resources for families who are searching 
                for their loved ones.
              </p>
            </div>
          </section>

          {/* What We Do Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">What We Do</h2>
            <div className="grid md:grid-cols-2 gap-8">
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-red-400 mb-4">📊 Data Visualization</h3>
                <p className="text-gray-300">
                  We present missing persons data in an interactive, accessible format that helps 
                  people understand the scope and geographic distribution of missing persons cases.
                </p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-red-400 mb-4">🗺️ Interactive Mapping</h3>
                <p className="text-gray-300">
                  Our interactive map displays missing persons cases across the United States, 
                  making it easier to see patterns and stay informed about cases in your area.
                </p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-red-400 mb-4">📢 Awareness Campaigns</h3>
                <p className="text-gray-300">
                  We raise awareness about the ongoing crisis of missing persons and provide 
                  educational resources about prevention and response.
                </p>
              </div>
              <div className="bg-gray-900 border border-gray-800 rounded-lg p-6">
                <h3 className="text-xl font-semibold text-red-400 mb-4">🤝 Community Support</h3>
                <p className="text-gray-300">
                  We provide a platform for communities to stay informed and engaged with 
                  missing persons cases, fostering collective action and support.
                </p>
              </div>
            </div>
          </section>

          {/* Statistics Section */}
          <section className="mb-16">
            <div className="bg-gradient-to-r from-red-900/20 to-gray-900/20 border border-red-800/30 rounded-lg p-8">
              <h2 className="text-3xl font-bold text-white mb-6">The Reality</h2>
              <div className="grid md:grid-cols-3 gap-8 text-center">
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-red-500 mb-2">600,000+</div>
                  <p className="text-gray-300">Missing persons reports filed annually in the US</p>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-red-500 mb-2">4,400+</div>
                  <p className="text-gray-300">Unidentified remains discovered each year</p>
                </div>
                <div>
                  <div className="text-3xl md:text-4xl font-bold text-red-500 mb-2">1,000+</div>
                  <p className="text-gray-300">Children go missing every day</p>
                </div>
              </div>
            </div>
          </section>

          {/* How You Can Help Section */}
          <section className="mb-16">
            <h2 className="text-3xl font-bold text-white mb-8">How You Can Help</h2>
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
              <div className="grid md:grid-cols-2 gap-8">
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">🔍 Stay Informed</h3>
                  <p className="text-gray-300 mb-4">
                    Regularly check our map and stay aware of missing persons cases in your area.
                  </p>
                  
                  <h3 className="text-xl font-semibold text-white mb-4">📱 Share Information</h3>
                  <p className="text-gray-300 mb-4">
                    Share missing persons alerts on social media to expand the search network.
                  </p>
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-white mb-4">👀 Be Vigilant</h3>
                  <p className="text-gray-300 mb-4">
                    If you see something suspicious or have information about a missing person, 
                    contact local authorities immediately.
                  </p>
                  
                  <h3 className="text-xl font-semibold text-white mb-4">❤️ Support Families</h3>
                  <p className="text-gray-300">
                    Consider volunteering with or donating to organizations that support 
                    families of missing persons.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Contact Section */}
          <section className="text-center">
            <div className="bg-gray-900 border border-gray-800 rounded-lg p-8">
              <h2 className="text-3xl font-bold text-white mb-6">Get Involved</h2>
              <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
                Together, we can make a difference. Every person who goes missing matters, 
                and every person who helps search brings hope to families in need.
              </p>
              <Link 
                href="/"
                className="inline-block bg-red-600 hover:bg-red-700 text-white font-semibold px-8 py-3 rounded-lg transition-colors"
              >
                View Missing Persons Map
              </Link>
            </div>
          </section>
        </div>
      </main>

      <footer className="bg-gray-900 border-t border-gray-800 py-8 mt-16">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-400">
            © 2025 SaveThemNow.Jesus - Dedicated to bringing missing persons home
          </p>
        </div>
      </footer>
    </div>
  )
}