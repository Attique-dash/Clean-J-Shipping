import { TruckIcon, ClockIcon } from '@heroicons/react/24/outline';

interface PopularRoute {
  origin: string;
  destination: string;
  count: number;
  averageTransitTime: number;
}

interface PopularRoutesProps {
  routes: PopularRoute[];
}

export function PopularRoutes({ routes }: PopularRoutesProps) {
  if (routes.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow p-6">
        <div className="text-center text-gray-500">No route data available</div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      <div className="px-6 py-5 border-b border-gray-200">
        <h3 className="text-lg font-medium text-gray-900">Popular Routes</h3>
      </div>
      <div className="divide-y divide-gray-200">
        {routes.map((route, index) => (
          <div key={index} className="px-6 py-4 hover:bg-gray-50">
            <div className="flex items-center">
              <div className="flex-shrink-0 h-10 w-10 rounded-full bg-blue-100 flex items-center justify-center">
                <TruckIcon className="h-5 w-5 text-blue-600" />
              </div>
              <div className="ml-4 flex-1">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-gray-900">
                    {route.origin} → {route.destination}
                  </p>
                  <div className="ml-2 flex-shrink-0 flex">
                    <p className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                      {route.count} shipments
                    </p>
                  </div>
                </div>
                <div className="mt-1 flex items-center text-sm text-gray-500">
                  <ClockIcon className="flex-shrink-0 mr-1.5 h-4 w-4 text-gray-400" />
                  <span>Avg. {Math.round(route.averageTransitTime)} hours transit time</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
