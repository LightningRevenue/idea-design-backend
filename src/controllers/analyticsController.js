const Analytics = require('../models/Analytics');

// Helper pentru detectarea device-ului
const getDeviceInfo = (userAgent) => {
  const isMobile = /Mobile|Android|iPhone|iPad/.test(userAgent);
  const isTablet = /iPad|Tablet/.test(userAgent);
  const isDesktop = !isMobile && !isTablet;
  
  let browser = 'Unknown';
  if (userAgent.includes('Chrome')) browser = 'Chrome';
  else if (userAgent.includes('Firefox')) browser = 'Firefox';
  else if (userAgent.includes('Safari')) browser = 'Safari';
  else if (userAgent.includes('Edge')) browser = 'Edge';
  
  let os = 'Unknown';
  if (userAgent.includes('Windows')) os = 'Windows';
  else if (userAgent.includes('Mac')) os = 'macOS';
  else if (userAgent.includes('Linux')) os = 'Linux';
  else if (userAgent.includes('Android')) os = 'Android';
  else if (userAgent.includes('iOS')) os = 'iOS';
  
  return { isMobile, isTablet, isDesktop, browser, os };
};

// @desc    Track event
// @route   POST /api/analytics/track
// @access  Public
const trackEvent = async (req, res, next) => {
  try {
    const {
      eventType,
      eventData = {},
      sessionId,
      userId,
      guestId
    } = req.body;

    // Validare eventType
    const validEventTypes = [
      'popup_view', 'popup_click', 'popup_close', 'page_view',
      'offers_page_view', 'product_click', 'product_view', 'add_to_cart',
      'category_view', 'category_filter', 'homepage_view', 'search_query'
    ];

    if (!validEventTypes.includes(eventType)) {
      return res.status(400).json({
        success: false,
        message: 'Tip de eveniment invalid'
      });
    }

    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress;
    const deviceInfo = getDeviceInfo(userAgent);

    const analyticsEvent = await Analytics.create({
      eventType,
      eventData: {
        ...eventData,
        pageUrl: eventData.pageUrl || req.headers.referer,
        referrer: req.headers.referer
      },
      userAgent,
      ipAddress,
      sessionId,
      userId,
      guestId,
      deviceInfo
    });

    res.status(201).json({
      success: true,
      data: analyticsEvent._id
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get analytics dashboard data
// @route   GET /api/analytics/dashboard
// @access  Private (Admin)
const getDashboardData = async (req, res, next) => {
  try {
    const { days = 30 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Statistici popup
    const popupStats = await Analytics.aggregate([
      {
        $match: {
          eventType: { $in: ['popup_view', 'popup_click', 'popup_close'] },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          uniqueSessions: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          eventType: '$_id',
          count: 1,
          uniqueUsers: { $size: '$uniqueSessions' }
        }
      }
    ]);

    // Conversie popup (click pe oferte / views)
    const popupViews = popupStats.find(s => s.eventType === 'popup_view')?.count || 0;
    const popupClicks = popupStats.find(s => s.eventType === 'popup_click')?.count || 0;
    const popupCloses = popupStats.find(s => s.eventType === 'popup_close')?.count || 0;
    const conversionRate = popupViews > 0 ? ((popupClicks / popupViews) * 100).toFixed(2) : 0;

    // Detalii metode de închidere popup
    const closeMethods = await Analytics.aggregate([
      {
        $match: {
          eventType: 'popup_close',
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventData.close_method',
          count: { $sum: 1 }
        }
      }
    ]);

    // Vizualizări pagina oferte
    const offersPageViews = await Analytics.countDocuments({
      eventType: 'offers_page_view',
      timestamp: { $gte: startDate }
    });

    // Page views pentru pagina de oferte iunie
    const juneOffersPageViews = await Analytics.countDocuments({
      eventType: 'page_view',
      'eventData.page': 'offers_june',
      timestamp: { $gte: startDate }
    });

    // Add to cart events din pagina oferte
    const addToCartEvents = await Analytics.aggregate([
      {
        $match: {
          eventType: 'add_to_cart',
          $or: [
            { 'eventData.page': 'offers_june' },
            { 'eventData.source': { $in: ['offers_page', 'reduceri_iunie'] } }
          ],
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            productId: { $ifNull: ['$eventData.product_id', '$eventData.productId'] },
            productName: { $ifNull: ['$eventData.product_name', '$eventData.productName'] }
          },
          addToCarts: { $sum: 1 },
          uniqueUsers: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          productId: '$_id.productId',
          productName: '$_id.productName',
          addToCarts: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { addToCarts: -1 } },
      { $limit: 10 }
    ]);

    // Top produse clickate în pagina oferte
    const topProductsInOffers = await Analytics.aggregate([
      {
        $match: {
          eventType: 'product_click',
          $or: [
            { 'eventData.page': 'offers_june' },
            { 'eventData.source': { $in: ['offers_page', 'reduceri_iunie'] } }
          ],
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            productId: { $ifNull: ['$eventData.product_id', '$eventData.productId'] },
            productName: { $ifNull: ['$eventData.product_name', '$eventData.productName'] }
          },
          clicks: { $sum: 1 },
          uniqueUsers: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          productId: '$_id.productId',
          productName: '$_id.productName',
          clicks: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { clicks: -1 } },
      { $limit: 10 }
    ]);

    // Statistici generale trafic
    const trafficStats = await Analytics.aggregate([
      {
        $match: {
          eventType: { $in: ['page_view', 'popup_view', 'product_click'] },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventType',
          count: { $sum: 1 },
          uniqueUsers: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          pageType: '$_id',
          views: '$count',
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      }
    ]);

    // Distribuție pe dispozitive
    const deviceStats = await Analytics.aggregate([
      {
        $match: { timestamp: { $gte: startDate } }
      },
      {
        $group: {
          _id: {
            isMobile: '$deviceInfo.isMobile',
            isTablet: '$deviceInfo.isTablet',
            isDesktop: '$deviceInfo.isDesktop'
          },
          count: { $sum: 1 }
        }
      }
    ]);

    // Top categorii vizualizate (din evenimentele de category_filter)
    const topCategories = await Analytics.aggregate([
      {
        $match: {
          eventType: 'category_filter',
          'eventData.category_name': { $exists: true, $ne: null },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: '$eventData.category_name',
          views: { $sum: 1 },
          uniqueUsers: { $addToSet: '$sessionId' }
        }
      },
      {
        $project: {
          categoryName: '$_id',
          views: 1,
          uniqueUsers: { $size: '$uniqueUsers' }
        }
      },
      { $sort: { views: -1 } },
      { $limit: 10 }
    ]);

    // Evoluție zilnică pentru ultimele 7 zile
    const last7Days = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      last7Days.push(date);
    }

    const dailyStats = await Analytics.aggregate([
      {
        $match: {
          timestamp: { $gte: last7Days[0] }
        }
      },
      {
        $group: {
          _id: {
            year: { $year: '$timestamp' },
            month: { $month: '$timestamp' },
            day: { $dayOfMonth: '$timestamp' },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      {
        $group: {
          _id: {
            year: '$_id.year',
            month: '$_id.month',
            day: '$_id.day'
          },
          events: {
            $push: {
              eventType: '$_id.eventType',
              count: '$count'
            }
          },
          totalEvents: { $sum: '$count' }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 } }
    ]);

    res.json({
      success: true,
      data: {
        period: `${days} zile`,
        popup: {
          stats: popupStats,
          conversionRate: parseFloat(conversionRate),
          summary: {
            views: popupViews,
            clicks: popupClicks,
            closes: popupCloses,
            dismisses: 0 // Nu mai diferențiem între tipuri de închidere
          },
          closeMethods: closeMethods.reduce((acc, method) => {
            acc[method._id || 'unknown'] = method.count;
            return acc;
          }, {})
        },
        offersPage: {
          views: offersPageViews + juneOffersPageViews, // Total views pentru oferte
          juneOffersViews: juneOffersPageViews,
          topProducts: topProductsInOffers,
          addToCartEvents: addToCartEvents
        },
        traffic: trafficStats,
        devices: deviceStats,
        topCategories,
        dailyTrend: dailyStats
      }
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get detailed popup analytics
// @route   GET /api/analytics/popup-details
// @access  Private (Admin)
const getPopupDetails = async (req, res, next) => {
  try {
    const { days = 7 } = req.query;
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - parseInt(days));

    // Detalii pe ore pentru popup
    const hourlyPopupStats = await Analytics.aggregate([
      {
        $match: {
          eventType: { $in: ['popup_view', 'popup_click_offers'] },
          timestamp: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            hour: { $hour: '$timestamp' },
            eventType: '$eventType'
          },
          count: { $sum: 1 }
        }
      },
      { $sort: { '_id.hour': 1 } }
    ]);

    // Fluxul utilizatorilor prin popup
    const userJourney = await Analytics.aggregate([
      {
        $match: {
          eventType: { $in: ['popup_view', 'popup_click_offers', 'offers_page_view'] },
          timestamp: { $gte: startDate }
        }
      },
      {
        $sort: { sessionId: 1, timestamp: 1 }
      },
      {
        $group: {
          _id: '$sessionId',
          events: {
            $push: {
              eventType: '$eventType',
              timestamp: '$timestamp'
            }
          }
        }
      }
    ]);

    res.json({
      success: true,
      data: {
        hourlyStats: hourlyPopupStats,
        userJourney: userJourney.slice(0, 100) // Limitat pentru performanță
      }
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  trackEvent,
  getDashboardData,
  getPopupDetails
}; 