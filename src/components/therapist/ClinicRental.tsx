import React, { useState, useEffect } from 'react'
import { supabase } from '../../lib/supabase'
import { useAuth } from '../../hooks/useAuth'
import { 
  Building, 
  MapPin, 
  Clock, 
  DollarSign, 
  Search, 
  Filter,
  Star,
  Wifi,
  Car,
  Coffee,
  Shield,
  Phone,
  MessageCircle,
  Calendar,
  Upload,
  CheckCircle,
  AlertTriangle,
  X,
  Eye,
  ExternalLink,
  Bookmark,
  BookmarkCheck,
  Users,
  Zap,
  Heart,
  Award,
  Target,
  Camera,
  Volume2,
  Thermometer,
  Accessibility,
  Home,
  Plus,
  CreditCard,
  FileText,
  Send
} from 'lucide-react'

interface ClinicListing {
  id: string
  name: string
  description: string | null
  location: string
  ownership_type: 'admin_owned' | 'externally_owned'
  contact_info: any
  amenities: string[]
  images: string[]
  is_active: boolean
  rental_options: RentalOption[]
}

interface RentalOption {
  id: string
  duration_type: 'hourly' | 'daily' | 'weekly' | 'monthly' | 'package'
  price: number
  currency: string
  description: string | null
  min_duration: number
  max_duration: number | null
  is_available: boolean
}

interface Booking {
  id: string
  clinic_id: string
  rental_option_id: string
  start_date: string
  end_date: string
  duration_value: number
  total_price: number
  status: 'pending' | 'confirmed' | 'rejected' | 'cancelled'
  payment_receipt_url: string | null
  booking_notes: string | null
  admin_notes: string | null
  created_at: string
  clinic: {
    name: string
    location: string
  }
  rental_option: {
    duration_type: string
    price: number
  }
}

export default function ClinicRental() {
  const [listings, setListings] = useState<ClinicListing[]>([])
  const [bookings, setBookings] = useState<Booking[]>([])
  const [activeTab, setActiveTab] = useState<'browse' | 'bookings'>('browse')
  const [searchTerm, setSearchTerm] = useState('')
  const [locationFilter, setLocationFilter] = useState('all')
  const [ownershipFilter, setOwnershipFilter] = useState('all')
  const [priceFilter, setPriceFilter] = useState('all')
  const [selectedListing, setSelectedListing] = useState<ClinicListing | null>(null)
  const [showBookingModal, setShowBookingModal] = useState(false)
  const [bookmarkedListings, setBookmarkedListings] = useState<string[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const { profile } = useAuth()

  useEffect(() => {
    fetchListings()
    fetchBookings()
  }, [profile])

  const fetchListings = async () => {
    try {
      const { data, error } = await supabase
        .from('clinic_listings')
        .select(`
          *,
          rental_options(*)
        `)
        .eq('is_active', true)
        .order('created_at', { ascending: false })

      if (error) throw error
      setListings(data || [])
    } catch (error) {
      console.error('Error fetching clinic listings:', error)
      setError('Failed to load clinic listings')
    } finally {
      setLoading(false)
    }
  }

  const fetchBookings = async () => {
    if (!profile) return

    try {
      const { data, error } = await supabase
        .from('clinic_bookings')
        .select(`
          *,
          clinic_listings!clinic_bookings_clinic_id_fkey(name, location),
          rental_options!clinic_bookings_rental_option_id_fkey(duration_type, price)
        `)
        .eq('therapist_id', profile.id)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      const formattedBookings = data?.map(booking => ({
        ...booking,
        clinic: booking.clinic_listings,
        rental_option: booking.rental_options
      })) || []
      
      setBookings(formattedBookings)
    } catch (error) {
      console.error('Error fetching bookings:', error)
    }
  }

  const createBooking = async (bookingData: any) => {
    try {
      const { error } = await supabase
        .from('clinic_bookings')
        .insert({
          clinic_id: bookingData.clinicId,
          therapist_id: profile!.id,
          rental_option_id: bookingData.rentalOptionId,
          start_date: bookingData.startDate,
          end_date: bookingData.endDate,
          duration_value: bookingData.durationValue,
          total_price: bookingData.totalPrice,
          booking_notes: bookingData.notes,
          status: 'pending'
        })

      if (error) throw error

      await fetchBookings()
      setShowBookingModal(false)
      setSelectedListing(null)
      alert('Booking request submitted successfully!')
    } catch (error) {
      console.error('Error creating booking:', error)
      alert('Error creating booking. Please try again.')
    }
  }

  const uploadReceipt = async (bookingId: string, file: File) => {
    try {
      // In a real app, you'd upload to Supabase Storage
      // For now, we'll simulate with a placeholder URL
      const receiptUrl = `receipt_${bookingId}_${Date.now()}.pdf`
      
      const { error } = await supabase
        .from('clinic_bookings')
        .update({ payment_receipt_url: receiptUrl })
        .eq('id', bookingId)

      if (error) throw error

      await fetchBookings()
      alert('Receipt uploaded successfully!')
    } catch (error) {
      console.error('Error uploading receipt:', error)
      alert('Error uploading receipt. Please try again.')
    }
  }

  const getAmenityIcon = (amenity: string) => {
    const amenityLower = amenity.toLowerCase()
    if (amenityLower.includes('parking')) return <Car className="w-4 h-4" />
    if (amenityLower.includes('wifi')) return <Wifi className="w-4 h-4" />
    if (amenityLower.includes('coffee')) return <Coffee className="w-4 h-4" />
    if (amenityLower.includes('wheelchair') || amenityLower.includes('accessible')) return <Accessibility className="w-4 h-4" />
    if (amenityLower.includes('sound') || amenityLower.includes('quiet')) return <Volume2 className="w-4 h-4" />
    if (amenityLower.includes('air') || amenityLower.includes('climate')) return <Thermometer className="w-4 h-4" />
    if (amenityLower.includes('lighting')) return <Zap className="w-4 h-4" />
    if (amenityLower.includes('waiting')) return <Users className="w-4 h-4" />
    return <Star className="w-4 h-4" />
  }

  const getOwnershipBadge = (type: string) => {
    return type === 'admin_owned' 
      ? { color: 'bg-blue-100 text-blue-800', label: 'Platform Managed', icon: Shield }
      : { color: 'bg-orange-100 text-orange-800', label: 'External Owner', icon: ExternalLink }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed': return 'bg-green-100 text-green-800'
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      case 'cancelled': return 'bg-gray-100 text-gray-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const formatPrice = (price: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency
    }).format(price)
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const toggleBookmark = (listingId: string) => {
    setBookmarkedListings(prev => 
      prev.includes(listingId) 
        ? prev.filter(id => id !== listingId)
        : [...prev, listingId]
    )
  }

  const filteredListings = listings.filter(listing => {
    const matchesSearch = listing.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         listing.description?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesLocation = locationFilter === 'all' || listing.location.toLowerCase().includes(locationFilter.toLowerCase())
    const matchesOwnership = ownershipFilter === 'all' || listing.ownership_type === ownershipFilter
    
    let matchesPrice = true
    if (priceFilter !== 'all') {
      const minPrice = Math.min(...listing.rental_options.map(opt => opt.price))
      switch (priceFilter) {
        case 'low': matchesPrice = minPrice < 50; break
        case 'medium': matchesPrice = minPrice >= 50 && minPrice <= 100; break
        case 'high': matchesPrice = minPrice > 100; break
      }
    }
    
    return matchesSearch && matchesLocation && matchesOwnership && matchesPrice
  })

  const locations = [...new Set(listings.map(l => l.location.split(',')[1]?.trim() || 'Unknown'))].filter(Boolean)

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-blue-200 border-t-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600 font-medium">Loading clinic listings...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Error Loading Clinics</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => {
              setError(null)
              setLoading(true)
              fetchListings()
            }}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Try Again
          </button>
        </div>
      </div>
    )
  }

  const renderBrowseTab = () => (
    <div className="h-full flex flex-col">
      {/* Fixed Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
          <input
            type="text"
            placeholder="Search clinics, locations, or amenities..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-gray-50 focus:bg-white transition-all"
          />
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-3">
          <select
            value={locationFilter}
            onChange={(e) => setLocationFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">All Locations</option>
            {locations.map(location => (
              <option key={location} value={location}>{location}</option>
            ))}
          </select>

          <select
            value={ownershipFilter}
            onChange={(e) => setOwnershipFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">All Types</option>
            <option value="admin_owned">Platform Managed</option>
            <option value="externally_owned">External Owner</option>
          </select>

          <select
            value={priceFilter}
            onChange={(e) => setPriceFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm"
          >
            <option value="all">All Prices</option>
            <option value="low">Under $50/hr</option>
            <option value="medium">$50-$100/hr</option>
            <option value="high">Over $100/hr</option>
          </select>

          {(searchTerm || locationFilter !== 'all' || ownershipFilter !== 'all' || priceFilter !== 'all') && (
            <button
              onClick={() => {
                setSearchTerm('')
                setLocationFilter('all')
                setOwnershipFilter('all')
                setPriceFilter('all')
              }}
              className="px-3 py-2 text-sm text-blue-600 hover:text-blue-800 font-medium"
            >
              Clear Filters
            </button>
          )}
        </div>

        {/* Results Count */}
        <div className="mt-3 text-sm text-gray-600">
          Showing {filteredListings.length} of {listings.length} clinics
        </div>
      </div>

      {/* Scrollable Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {filteredListings.length === 0 ? (
          <div className="text-center py-16">
            <Building className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No clinics found</h3>
            <p className="text-gray-600">
              {searchTerm || locationFilter !== 'all' || ownershipFilter !== 'all' || priceFilter !== 'all'
                ? 'Try adjusting your search or filters.'
                : 'No clinic listings are currently available.'
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
            {filteredListings.map((listing) => {
              const ownershipBadge = getOwnershipBadge(listing.ownership_type)
              const isBookmarked = bookmarkedListings.includes(listing.id)
              const minPrice = Math.min(...listing.rental_options.map(opt => opt.price))
              const BadgeIcon = ownershipBadge.icon

              return (
                <div key={listing.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden hover:shadow-lg transition-all duration-200 hover:-translate-y-1">
                  {/* Image */}
                  <div className="relative h-48 bg-gray-100">
                    {listing.images.length > 0 ? (
                      <img
                        src={listing.images[0]}
                        alt={listing.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Building className="w-16 h-16 text-gray-400" />
                      </div>
                    )}
                    
                    {/* Bookmark Button */}
                    <button
                      onClick={() => toggleBookmark(listing.id)}
                      className={`absolute top-3 right-3 p-2 rounded-full transition-all ${
                        isBookmarked 
                          ? 'bg-yellow-500 text-white shadow-lg' 
                          : 'bg-white bg-opacity-90 text-gray-600 hover:bg-yellow-500 hover:text-white'
                      }`}
                    >
                      {isBookmarked ? <BookmarkCheck className="w-4 h-4" /> : <Bookmark className="w-4 h-4" />}
                    </button>

                    {/* Ownership Badge */}
                    <div className={`absolute top-3 left-3 inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${ownershipBadge.color}`}>
                      <BadgeIcon className="w-3 h-3 mr-1" />
                      {ownershipBadge.label}
                    </div>
                  </div>

                  {/* Content */}
                  <div className="p-6">
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="text-lg font-semibold text-gray-900 line-clamp-1">{listing.name}</h3>
                      <div className="text-right">
                        <div className="text-lg font-bold text-green-600">
                          {formatPrice(minPrice)}
                        </div>
                        <div className="text-xs text-gray-500">from /hour</div>
                      </div>
                    </div>

                    <div className="flex items-center text-gray-600 mb-3">
                      <MapPin className="w-4 h-4 mr-1 flex-shrink-0" />
                      <span className="text-sm line-clamp-1">{listing.location}</span>
                    </div>

                    <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                      {listing.description}
                    </p>

                    {/* Amenities */}
                    <div className="mb-4">
                      <div className="flex flex-wrap gap-1">
                        {listing.amenities.slice(0, 4).map((amenity, index) => (
                          <div key={index} className="flex items-center space-x-1 px-2 py-1 bg-gray-100 rounded-md">
                            {getAmenityIcon(amenity)}
                            <span className="text-xs text-gray-700">{amenity}</span>
                          </div>
                        ))}
                        {listing.amenities.length > 4 && (
                          <div className="px-2 py-1 bg-gray-100 rounded-md">
                            <span className="text-xs text-gray-600">+{listing.amenities.length - 4} more</span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Rental Options Preview */}
                    <div className="mb-4">
                      <div className="text-xs text-gray-500 mb-2">Available Options:</div>
                      <div className="flex flex-wrap gap-1">
                        {listing.rental_options.slice(0, 3).map((option) => (
                          <span key={option.id} className="px-2 py-1 bg-blue-50 text-blue-700 text-xs rounded-md">
                            {option.duration_type} - {formatPrice(option.price)}
                          </span>
                        ))}
                        {listing.rental_options.length > 3 && (
                          <span className="px-2 py-1 bg-gray-50 text-gray-600 text-xs rounded-md">
                            +{listing.rental_options.length - 3} more
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex space-x-2">
                      <button
                        onClick={() => setSelectedListing(listing)}
                        className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-blue-700 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        <Eye className="w-4 h-4 mr-1" />
                        View Details
                      </button>
                      
                      {listing.ownership_type === 'admin_owned' ? (
                        <button
                          onClick={() => {
                            setSelectedListing(listing)
                            setShowBookingModal(true)
                          }}
                          className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Calendar className="w-4 h-4 mr-1" />
                          Book Now
                        </button>
                      ) : (
                        <a
                          href={`https://wa.me/${listing.contact_info?.whatsapp?.replace(/[^0-9]/g, '')}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex-1 flex items-center justify-center px-3 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4 mr-1" />
                          WhatsApp
                        </a>
                      )}
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )

  const renderBookingsTab = () => (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200 p-4">
        <h3 className="text-lg font-semibold text-gray-900">My Bookings</h3>
        <p className="text-sm text-gray-600">Track your clinic rental bookings and payments</p>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4">
        {bookings.length === 0 ? (
          <div className="text-center py-16">
            <Calendar className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No bookings yet</h3>
            <p className="text-gray-600 mb-6">Start by browsing available clinic spaces</p>
            <button
              onClick={() => setActiveTab('browse')}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              <Building className="w-4 h-4 mr-2" />
              Browse Clinics
            </button>
          </div>
        ) : (
          <div className="space-y-4">
            {bookings.map((booking) => (
              <div key={booking.id} className="bg-white border border-gray-200 rounded-xl p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900">{booking.clinic.name}</h4>
                    <div className="flex items-center text-gray-600 mt-1">
                      <MapPin className="w-4 h-4 mr-1" />
                      <span className="text-sm">{booking.clinic.location}</span>
                    </div>
                  </div>
                  <span className={`inline-flex px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(booking.status)}`}>
                    {booking.status.charAt(0).toUpperCase() + booking.status.slice(1)}
                  </span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div>
                    <div className="text-sm text-gray-500">Rental Type</div>
                    <div className="font-medium text-gray-900 capitalize">
                      {booking.rental_option.duration_type} ({booking.duration_value} {booking.rental_option.duration_type === 'hourly' ? 'hours' : booking.rental_option.duration_type.slice(0, -2) + 's'})
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Duration</div>
                    <div className="font-medium text-gray-900">
                      {formatDate(booking.start_date)} - {formatDate(booking.end_date)}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Total Price</div>
                    <div className="font-medium text-green-600 text-lg">
                      {formatPrice(booking.total_price)}
                    </div>
                  </div>
                </div>

                {booking.booking_notes && (
                  <div className="mb-4">
                    <div className="text-sm text-gray-500">Notes</div>
                    <div className="text-sm text-gray-700">{booking.booking_notes}</div>
                  </div>
                )}

                {booking.admin_notes && (
                  <div className="mb-4 p-3 bg-blue-50 rounded-lg">
                    <div className="text-sm font-medium text-blue-900">Admin Notes</div>
                    <div className="text-sm text-blue-800">{booking.admin_notes}</div>
                  </div>
                )}

                {/* Payment Receipt */}
                <div className="flex items-center justify-between pt-4 border-t border-gray-200">
                  <div className="flex items-center space-x-2">
                    {booking.payment_receipt_url ? (
                      <div className="flex items-center space-x-2 text-green-600">
                        <CheckCircle className="w-4 h-4" />
                        <span className="text-sm font-medium">Receipt Uploaded</span>
                      </div>
                    ) : booking.status === 'confirmed' ? (
                      <div className="flex items-center space-x-2">
                        <input
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) uploadReceipt(booking.id, file)
                          }}
                          className="hidden"
                          id={`receipt-${booking.id}`}
                        />
                        <label
                          htmlFor={`receipt-${booking.id}`}
                          className="inline-flex items-center px-3 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 cursor-pointer text-sm"
                        >
                          <Upload className="w-4 h-4 mr-1" />
                          Upload Receipt
                        </label>
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">
                        Receipt upload available after confirmation
                      </div>
                    )}
                  </div>
                  
                  <div className="text-xs text-gray-500">
                    Booked {formatDate(booking.created_at)}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )

  return (
    <div className="h-full flex flex-col bg-gray-50">
      {/* Tab Navigation */}
      <div className="flex-shrink-0 bg-white border-b border-gray-200">
        <div className="flex space-x-8 px-4">
          <button
            onClick={() => setActiveTab('browse')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'browse'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Building className="w-5 h-5" />
              <span>Browse Clinics</span>
            </div>
          </button>
          
          <button
            onClick={() => setActiveTab('bookings')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'bookings'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <div className="flex items-center space-x-2">
              <Calendar className="w-5 h-5" />
              <span>My Bookings</span>
              {bookings.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-xs px-2 py-0.5 rounded-full">
                  {bookings.length}
                </span>
              )}
            </div>
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="flex-1 min-h-0">
        {activeTab === 'browse' ? renderBrowseTab() : renderBookingsTab()}
      </div>

      {/* Listing Details Modal */}
      {selectedListing && !showBookingModal && (
        <ListingDetailsModal
          listing={selectedListing}
          onClose={() => setSelectedListing(null)}
          onBook={() => setShowBookingModal(true)}
        />
      )}

      {/* Booking Modal */}
      {showBookingModal && selectedListing && (
        <BookingModal
          listing={selectedListing}
          onClose={() => {
            setShowBookingModal(false)
            setSelectedListing(null)
          }}
          onBook={createBooking}
        />
      )}
    </div>
  )
}

// Listing Details Modal Component
interface ListingDetailsModalProps {
  listing: ClinicListing
  onClose: () => void
  onBook: () => void
}

const ListingDetailsModal: React.FC<ListingDetailsModalProps> = ({ listing, onClose, onBook }) => {
  const ownershipBadge = getOwnershipBadge(listing.ownership_type)
  const BadgeIcon = ownershipBadge.icon

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white">
            {/* Header */}
            <div className="flex items-start justify-between p-6 border-b border-gray-200">
              <div className="flex items-start space-x-4">
                <div className="p-3 rounded-xl bg-blue-100">
                  <Building className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">{listing.name}</h3>
                  <div className="flex items-center text-gray-600 mb-2">
                    <MapPin className="w-4 h-4 mr-1" />
                    <span>{listing.location}</span>
                  </div>
                  <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${ownershipBadge.color}`}>
                    <BadgeIcon className="w-4 h-4 mr-1" />
                    {ownershipBadge.label}
                  </div>
                </div>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Content */}
            <div className="p-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Images */}
                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Photos</h4>
                  <div className="grid grid-cols-2 gap-2">
                    {listing.images.length > 0 ? (
                      listing.images.map((image, index) => (
                        <img
                          key={index}
                          src={image}
                          alt={`${listing.name} ${index + 1}`}
                          className="w-full h-32 object-cover rounded-lg"
                        />
                      ))
                    ) : (
                      <div className="col-span-2 h-32 bg-gray-100 rounded-lg flex items-center justify-center">
                        <Camera className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                  </div>
                </div>

                {/* Details */}
                <div className="space-y-6">
                  {/* Description */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Description</h4>
                    <p className="text-gray-700 leading-relaxed">{listing.description}</p>
                  </div>

                  {/* Amenities */}
                  <div>
                    <h4 className="font-semibold text-gray-900 mb-3">Amenities</h4>
                    <div className="grid grid-cols-2 gap-2">
                      {listing.amenities.map((amenity, index) => (
                        <div key={index} className="flex items-center space-x-2 text-sm text-gray-700">
                          {getAmenityIcon(amenity)}
                          <span>{amenity}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Contact Info */}
                  {listing.ownership_type === 'externally_owned' && (
                    <div>
                      <h4 className="font-semibold text-gray-900 mb-3">Contact Information</h4>
                      <div className="space-y-2">
                        {listing.contact_info?.owner_name && (
                          <div className="flex items-center space-x-2">
                            <User className="w-4 h-4 text-gray-500" />
                            <span className="text-sm text-gray-700">{listing.contact_info.owner_name}</span>
                          </div>
                        )}
                        {listing.contact_info?.whatsapp && (
                          <div className="flex items-center space-x-2">
                            <MessageCircle className="w-4 h-4 text-green-500" />
                            <span className="text-sm text-gray-700">{listing.contact_info.whatsapp}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Rental Options */}
              <div className="mt-6">
                <h4 className="font-semibold text-gray-900 mb-4">Rental Options</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {listing.rental_options.map((option) => (
                    <div key={option.id} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <h5 className="font-medium text-gray-900 capitalize">{option.duration_type}</h5>
                        <div className="text-lg font-bold text-green-600">
                          {formatPrice(option.price, option.currency)}
                        </div>
                      </div>
                      {option.description && (
                        <p className="text-sm text-gray-600 mb-2">{option.description}</p>
                      )}
                      <div className="text-xs text-gray-500">
                        Min: {option.min_duration} • Max: {option.max_duration || 'No limit'}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Footer Actions */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
              
              {listing.ownership_type === 'admin_owned' ? (
                <button
                  onClick={onBook}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
                >
                  Book This Clinic
                </button>
              ) : (
                <a
                  href={`https://wa.me/${listing.contact_info?.whatsapp?.replace(/[^0-9]/g, '')}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
                >
                  <MessageCircle className="w-4 h-4 mr-2" />
                  Contact via WhatsApp
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

// Booking Modal Component
interface BookingModalProps {
  listing: ClinicListing
  onClose: () => void
  onBook: (bookingData: any) => void
}

const BookingModal: React.FC<BookingModalProps> = ({ listing, onClose, onBook }) => {
  const [selectedOption, setSelectedOption] = useState<RentalOption | null>(null)
  const [startDate, setStartDate] = useState('')
  const [durationValue, setDurationValue] = useState(1)
  const [notes, setNotes] = useState('')
  const [totalPrice, setTotalPrice] = useState(0)

  useEffect(() => {
    if (selectedOption) {
      setTotalPrice(selectedOption.price * durationValue)
    }
  }, [selectedOption, durationValue])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedOption || !startDate) return

    const start = new Date(startDate)
    let end = new Date(start)

    switch (selectedOption.duration_type) {
      case 'hourly':
        end.setHours(start.getHours() + durationValue)
        break
      case 'daily':
        end.setDate(start.getDate() + durationValue)
        break
      case 'weekly':
        end.setDate(start.getDate() + (durationValue * 7))
        break
      case 'monthly':
        end.setMonth(start.getMonth() + durationValue)
        break
      case 'package':
        end.setDate(start.getDate() + durationValue)
        break
    }

    onBook({
      clinicId: listing.id,
      rentalOptionId: selectedOption.id,
      startDate: start.toISOString(),
      endDate: end.toISOString(),
      durationValue,
      totalPrice,
      notes
    })
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-bold text-gray-900">Book {listing.name}</h3>
                <button
                  type="button"
                  onClick={onClose}
                  className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {/* Rental Option Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Select Rental Option
                  </label>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {listing.rental_options.map((option) => (
                      <button
                        key={option.id}
                        type="button"
                        onClick={() => setSelectedOption(option)}
                        className={`p-4 border-2 rounded-lg text-left transition-all ${
                          selectedOption?.id === option.id
                            ? 'border-blue-500 bg-blue-50'
                            : 'border-gray-200 hover:border-blue-300'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="font-medium text-gray-900 capitalize">{option.duration_type}</h4>
                          <div className="text-lg font-bold text-green-600">
                            {formatPrice(option.price, option.currency)}
                          </div>
                        </div>
                        {option.description && (
                          <p className="text-sm text-gray-600">{option.description}</p>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {selectedOption && (
                  <>
                    {/* Start Date */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Start Date & Time
                      </label>
                      <input
                        type="datetime-local"
                        value={startDate}
                        onChange={(e) => setStartDate(e.target.value)}
                        min={new Date().toISOString().slice(0, 16)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                    </div>

                    {/* Duration */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duration ({selectedOption.duration_type === 'hourly' ? 'hours' : selectedOption.duration_type.slice(0, -2) + 's'})
                      </label>
                      <input
                        type="number"
                        value={durationValue}
                        onChange={(e) => setDurationValue(parseInt(e.target.value) || 1)}
                        min={selectedOption.min_duration}
                        max={selectedOption.max_duration || undefined}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        required
                      />
                      <div className="text-xs text-gray-500 mt-1">
                        Min: {selectedOption.min_duration} • Max: {selectedOption.max_duration || 'No limit'}
                      </div>
                    </div>

                    {/* Total Price */}
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex items-center justify-between">
                        <span className="font-medium text-green-900">Total Price</span>
                        <span className="text-2xl font-bold text-green-600">
                          {formatPrice(totalPrice)}
                        </span>
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        {durationValue} {selectedOption.duration_type === 'hourly' ? 'hours' : selectedOption.duration_type.slice(0, -2) + 's'} × {formatPrice(selectedOption.price)}
                      </div>
                    </div>

                    {/* Notes */}
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Additional Notes (Optional)
                      </label>
                      <textarea
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Any special requirements or notes for the clinic owner..."
                      />
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              
              <button
                type="submit"
                disabled={!selectedOption || !startDate}
                className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Submit Booking Request
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function getOwnershipBadge(type: string) {
  return type === 'admin_owned' 
    ? { color: 'bg-blue-100 text-blue-800', label: 'Platform Managed', icon: Shield }
    : { color: 'bg-orange-100 text-orange-800', label: 'External Owner', icon: ExternalLink }
}

function formatPrice(price: number, currency: string = 'USD') {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(price)
}

function getAmenityIcon(amenity: string) {
  const amenityLower = amenity.toLowerCase()
  if (amenityLower.includes('parking')) return <Car className="w-4 h-4" />
  if (amenityLower.includes('wifi')) return <Wifi className="w-4 h-4" />
  if (amenityLower.includes('coffee')) return <Coffee className="w-4 h-4" />
  if (amenityLower.includes('wheelchair') || amenityLower.includes('accessible')) return <Accessibility className="w-4 h-4" />
  if (amenityLower.includes('sound') || amenityLower.includes('quiet')) return <Volume2 className="w-4 h-4" />
  if (amenityLower.includes('air') || amenityLower.includes('climate')) return <Thermometer className="w-4 h-4" />
  if (amenityLower.includes('lighting')) return <Zap className="w-4 h-4" />
  if (amenityLower.includes('waiting')) return <Users className="w-4 h-4" />
  return <Star className="w-4 h-4" />
}