export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center p-4">
      <div className="text-center max-w-2xl mx-auto">
        {/* Offline Icon */}
        <div className="mb-8">
          <div className="mx-auto w-32 h-32 bg-gray-800 rounded-full flex items-center justify-center">
            <svg 
              className="w-16 h-16 text-gray-400" 
              fill="currentColor" 
              viewBox="0 0 20 20"
            >
              <path 
                fillRule="evenodd" 
                d="M13.477 14.89A6 6 0 015.11 6.524l8.367 8.368zm1.414-1.414L6.524 5.11a6 6 0 018.367 8.367zM18 10a8 8 0 11-16 0 8 8 0 0116 0z" 
                clipRule="evenodd" 
              />
            </svg>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-4xl font-bold mb-4">You&apos;re Offline</h1>
        
        {/* Description */}
        <p className="text-xl text-gray-300 mb-8">
          Don&apos;t worry - you can still view cached missing persons data and your app will sync when you&apos;re back online.
        </p>

        {/* Features Available Offline */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          <div className="bg-gray-900 p-6 rounded-lg">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold">Cached Data</h3>
            </div>
            <p className="text-gray-400 text-sm">
              View recently loaded missing persons cases and search through cached results.
            </p>
          </div>

          <div className="bg-gray-900 p-6 rounded-lg">
            <div className="flex items-center mb-3">
              <div className="w-8 h-8 bg-green-600 rounded-full flex items-center justify-center mr-3">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.293l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </div>
              <h3 className="font-semibold">Auto Sync</h3>
            </div>
            <p className="text-gray-400 text-sm">
              Any actions you take will be automatically synced when your connection returns.
            </p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 justify-center">
          <button 
            onClick={() => window.location.reload()} 
            className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors"
          >
            Try Again
          </button>
          
          <button 
            onClick={() => window.history.back()} 
            className="px-6 py-3 bg-gray-700 text-white rounded-lg font-medium hover:bg-gray-600 transition-colors"
          >
            Go Back
          </button>
        </div>

        {/* Connection Status */}
        <div className="mt-8 p-4 bg-gray-900 rounded-lg">
          <div className="flex items-center justify-center text-sm text-gray-400">
            <div className="w-2 h-2 bg-red-500 rounded-full mr-2 animate-pulse"></div>
            Connection status: Offline
          </div>
        </div>

        {/* Tips */}
        <div className="mt-8 text-left bg-gray-900 p-6 rounded-lg">
          <h3 className="font-semibold mb-4 text-center">Tips for Offline Usage</h3>
          <ul className="space-y-2 text-sm text-gray-300">
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              Recently viewed cases are available offline
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              Search through cached data still works
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              Your actions will sync automatically when online
            </li>
            <li className="flex items-start">
              <span className="text-blue-400 mr-2">•</span>
              Check your internet connection and refresh the page
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}