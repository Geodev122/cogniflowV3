import React from 'react';
import { 
  Users, 
  Calendar, 
  TrendingUp, 
  Clock, 
  DollarSign, 
  Award,
  AlertTriangle,
  CheckCircle,
  BookOpen,
  FileText
} from 'lucide-react';

interface OverviewTabProps {
  className?: string;
}

const OverviewTab: React.FC<OverviewTabProps> = ({ className = '' }) => {
  // Mock data for demonstration
  const stats = {
    totalClients: 24,
    activeClients: 18,
    sessionsThisWeek: 12,
    sessionsThisMonth: 48,
    revenue: 4800,
    ceCredits: 42,
    upcomingSessions: 5,
    pendingTasks: 3
  };

  const upcomingSessions = [
    { id: 1, client: 'Sarah M.', time: '10:00 AM', type: 'Individual', status: 'confirmed' },
    { id: 2, client: 'John D.', time: '2:00 PM', type: 'Couples', status: 'confirmed' },
    { id: 3, client: 'Maria L.', time: '4:00 PM', type: 'Family', status: 'pending' },
  ];

  const recentActivity = [
    { id: 1, type: 'session', description: 'Completed session with Sarah M.', time: '2 hours ago' },
    { id: 2, type: 'note', description: 'Added progress note for John D.', time: '4 hours ago' },
    { id: 3, type: 'ce', description: 'Completed "Trauma-Informed Care" course', time: '1 day ago' },
    { id: 4, type: 'client', description: 'New client intake: Maria L.', time: '2 days ago' },
  ];

  const alerts = [
    { id: 1, type: 'warning', message: 'License expires in 30 days', priority: 'high' },
    { id: 2, type: 'info', message: '3 pending session notes to complete', priority: 'medium' },
    { id: 3, type: 'success', message: 'Monthly CE requirement met', priority: 'low' },
  ];

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'session':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'note':
        return <FileText className="h-4 w-4 text-green-500" />;
      case 'ce':
        return <BookOpen className="h-4 w-4 text-purple-500" />;
      case 'client':
        return <Users className="h-4 w-4 text-indigo-500" />;
      default:
        return <CheckCircle className="h-4 w-4 text-gray-500" />;
    }
  };

  const getAlertIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-500" />;
      default:
        return <AlertTriangle className="h-5 w-5 text-blue-500" />;
    }
  };

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Welcome Section */}
      <div className="bg-gradient-to-r from-indigo-500 to-purple-600 rounded-xl p-6 text-white">
        <h2 className="text-2xl font-bold mb-2">Welcome back, Dr. Smith!</h2>
        <p className="text-indigo-100">
          You have {stats.upcomingSessions} sessions scheduled today and {stats.pendingTasks} pending tasks.
        </p>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="h-6 w-6 text-blue-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Active Clients</p>
              <p className="text-2xl font-bold text-gray-900">{stats.activeClients}</p>
              <p className="text-xs text-gray-500">of {stats.totalClients} total</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-green-100 rounded-lg">
              <Calendar className="h-6 w-6 text-green-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Sessions This Month</p>
              <p className="text-2xl font-bold text-gray-900">{stats.sessionsThisMonth}</p>
              <p className="text-xs text-gray-500">{stats.sessionsThisWeek} this week</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-purple-100 rounded-lg">
              <DollarSign className="h-6 w-6 text-purple-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">Monthly Revenue</p>
              <p className="text-2xl font-bold text-gray-900">${stats.revenue.toLocaleString()}</p>
              <p className="text-xs text-green-600 flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                +12% from last month
              </p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-4 lg:p-6 shadow-sm border border-gray-200">
          <div className="flex items-center">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Award className="h-6 w-6 text-yellow-600" />
            </div>
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-600">CE Credits</p>
              <p className="text-2xl font-bold text-gray-900">{stats.ceCredits}</p>
              <p className="text-xs text-gray-500">earned this year</p>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Upcoming Sessions */}
        <div className="lg:col-span-2">
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Today's Sessions</h3>
            </div>
            <div className="p-4 lg:p-6">
              <div className="space-y-4">
                {upcomingSessions.map((session) => (
                  <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-4">
                      <div className="flex-shrink-0">
                        <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                          <Users className="h-5 w-5 text-indigo-600" />
                        </div>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-900">{session.client}</p>
                        <p className="text-sm text-gray-500">{session.type} Session</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900">{session.time}</p>
                      <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                        session.status === 'confirmed' 
                          ? 'bg-green-100 text-green-800' 
                          : 'bg-yellow-100 text-yellow-800'
                      }`}>
                        {session.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4">
                <button className="w-full text-center text-sm text-indigo-600 hover:text-indigo-700 font-medium">
                  View all sessions
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Alerts & Notifications */}
        <div className="space-y-6">
          {/* Alerts */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Alerts</h3>
            </div>
            <div className="p-4 lg:p-6">
              <div className="space-y-3">
                {alerts.map((alert) => (
                  <div key={alert.id} className="flex items-start space-x-3 p-3 rounded-lg bg-gray-50">
                    {getAlertIcon(alert.type)}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm text-gray-900">{alert.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-xl shadow-sm border border-gray-200">
            <div className="p-4 lg:p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Quick Actions</h3>
            </div>
            <div className="p-4 lg:p-6">
              <div className="space-y-3">
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Users className="h-5 w-5 text-indigo-600" />
                    <span className="text-sm font-medium text-gray-900">Add New Client</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <Calendar className="h-5 w-5 text-green-600" />
                    <span className="text-sm font-medium text-gray-900">Schedule Session</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-purple-600" />
                    <span className="text-sm font-medium text-gray-900">Write Progress Note</span>
                  </div>
                </button>
                <button className="w-full text-left p-3 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors">
                  <div className="flex items-center space-x-3">
                    <BookOpen className="h-5 w-5 text-yellow-600" />
                    <span className="text-sm font-medium text-gray-900">Browse CE Courses</span>
                  </div>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="p-4 lg:p-6 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">Recent Activity</h3>
        </div>
        <div className="p-4 lg:p-6">
          <div className="space-y-4">
            {recentActivity.map((activity) => (
              <div key={activity.id} className="flex items-start space-x-3">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(activity.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-gray-900">{activity.description}</p>
                  <p className="text-xs text-gray-500 mt-1">{activity.time}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 pt-4 border-t border-gray-200">
            <button className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              View all activity
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default OverviewTab;