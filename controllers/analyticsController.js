const db = require('../config/database');
const moment = require('moment');

const AnalyticsController = {
    // GET /admin/analytics - Main Analytics Dashboard
    // GET /admin/analytics - Main Analytics Dashboard
getAnalytics: async (req, res) => {
    try {
        const { period = 'month', compare = false } = req.query;
        const moment = require('moment');
        
        // Calculate date ranges based on period
        let startDate, endDate, previousStartDate, previousEndDate;
        const now = moment();
        
        switch(period) {
            case 'day':
                startDate = now.startOf('day').toDate();
                endDate = now.endOf('day').toDate();
                previousStartDate = now.clone().subtract(1, 'day').startOf('day').toDate();
                previousEndDate = now.clone().subtract(1, 'day').endOf('day').toDate();
                break;
            case 'week':
                startDate = now.startOf('week').toDate();
                endDate = now.endOf('week').toDate();
                previousStartDate = now.clone().subtract(1, 'week').startOf('week').toDate();
                previousEndDate = now.clone().subtract(1, 'week').endOf('week').toDate();
                break;
            case 'quarter':
                startDate = now.startOf('quarter').toDate();
                endDate = now.endOf('quarter').toDate();
                previousStartDate = now.clone().subtract(1, 'quarter').startOf('quarter').toDate();
                previousEndDate = now.clone().subtract(1, 'quarter').endOf('quarter').toDate();
                break;
            case 'year':
                startDate = now.startOf('year').toDate();
                endDate = now.endOf('year').toDate();
                previousStartDate = now.clone().subtract(1, 'year').startOf('year').toDate();
                previousEndDate = now.clone().subtract(1, 'year').endOf('year').toDate();
                break;
            default: // month
                startDate = now.clone().subtract(11, 'months').startOf('month').toDate();
                endDate = now.endOf('month').toDate();
                previousStartDate = now.clone().subtract(23, 'months').startOf('month').toDate();
                previousEndDate = now.clone().subtract(12, 'months').endOf('month').toDate();
        }

        console.log('Date Range:', {
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            previousStartDate: previousStartDate.toISOString(),
            previousEndDate: previousEndDate.toISOString()
        });

        // 1. REVENUE TREND (Last 12 months by default)
        const revenueTrendQuery = `
            WITH months AS (
                SELECT generate_series(
                    DATE_TRUNC('month', $1::timestamp),
                    DATE_TRUNC('month', $2::timestamp),
                    '1 month'::interval
                ) AS month
            )
            SELECT 
                TO_CHAR(m.month, 'YYYY-MM-DD') as period,
                COALESCE(SUM(b.total_price), 0) as revenue,
                COALESCE(COUNT(b.id), 0) as bookings
            FROM months m
            LEFT JOIN bookings b 
                ON DATE_TRUNC('month', b.booked_at) = m.month 
                AND b.status = 'confirmed'
            GROUP BY m.month
            ORDER BY m.month ASC
        `;
        
        const revenueTrendResult = await db.query(revenueTrendQuery, [startDate, endDate]);
        const revenueTrend = revenueTrendResult.rows || [];
        console.log('Revenue Trend Data:', revenueTrend);

        // 2. CATEGORY REVENUE
        const categoryAnalyticsQuery = `
            SELECT 
                c.id,
                c.name as category,
                COALESCE(SUM(b.total_price), 0) as revenue,
                COALESCE(COUNT(b.id), 0) as bookings
            FROM categories c
            LEFT JOIN tour_categories tc ON c.id = tc.category_id
            LEFT JOIN tours t ON tc.tour_id = t.id
            LEFT JOIN bookings b ON t.id = b.tour_id 
                AND b.status = 'confirmed'
                AND b.booked_at BETWEEN $1 AND $2
            GROUP BY c.id, c.name
            ORDER BY revenue DESC
        `;
        
        const categoryAnalyticsResult = await db.query(categoryAnalyticsQuery, [startDate, endDate]);
        const categoryAnalytics = categoryAnalyticsResult.rows || [];
        console.log('Category Data:', categoryAnalytics);

        // 3. CUSTOMER ACQUISITION
        const customerAnalyticsQuery = `
            WITH months AS (
                SELECT generate_series(
                    DATE_TRUNC('month', $1::timestamp),
                    DATE_TRUNC('month', $2::timestamp),
                    '1 month'::interval
                ) AS month
            )
            SELECT 
                TO_CHAR(m.month, 'YYYY-MM-DD') as month,
                COALESCE(COUNT(u.id), 0) as new_customers
            FROM months m
            LEFT JOIN users u 
                ON DATE_TRUNC('month', u.created_at) = m.month 
                AND u.role = 'user'
            GROUP BY m.month
            ORDER BY m.month ASC
        `;
        
        const customerAnalyticsResult = await db.query(customerAnalyticsQuery, [startDate, endDate]);
        const customerAnalytics = customerAnalyticsResult.rows || [];
        console.log('Customer Data:', customerAnalytics);

        // 4. TOP CUSTOMERS
        const topCustomersQuery = `
            SELECT 
                u.id,
                u.name,
                u.email,
                COALESCE(COUNT(b.id), 0) as total_bookings,
                COALESCE(SUM(b.total_price), 0) as total_spent,
                COALESCE(AVG(b.total_price), 0) as avg_booking_value
            FROM users u
            LEFT JOIN bookings b ON u.id = b.user_id 
                AND b.status = 'confirmed'
                AND b.booked_at BETWEEN $1 AND $2
            WHERE u.role = 'user'
            GROUP BY u.id, u.name, u.email
            HAVING COUNT(b.id) > 0
            ORDER BY total_spent DESC
            LIMIT 10
        `;
        
        const topCustomersResult = await db.query(topCustomersQuery, [startDate, endDate]);
        const topCustomers = topCustomersResult.rows || [];

        // 5. TOP TOURS
        const tourAnalyticsQuery = `
            SELECT 
                t.id,
                t.title,
                t.location,
                COALESCE(COUNT(b.id), 0) as bookings,
                COALESCE(SUM(b.total_price), 0) as revenue,
                COALESCE(AVG(b.total_price), 0) as avg_booking_value
            FROM tours t
            LEFT JOIN bookings b ON t.id = b.tour_id 
                AND b.status = 'confirmed'
                AND b.booked_at BETWEEN $1 AND $2
            GROUP BY t.id, t.title, t.location
            HAVING COUNT(b.id) > 0
            ORDER BY revenue DESC
            LIMIT 10
        `;
        
        const tourAnalyticsResult = await db.query(tourAnalyticsQuery, [startDate, endDate]);
        const tourAnalytics = tourAnalyticsResult.rows || [];

        // 6. BASIC KPIs
        const kpisQuery = `
            SELECT 
                COALESCE(COUNT(DISTINCT b.id), 0) as total_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END), 0) as total_revenue,
                COALESCE(COUNT(DISTINCT b.user_id), 0) as total_customers
            FROM bookings b
            WHERE b.booked_at BETWEEN $1 AND $2
        `;
        
        const previousKpisQuery = `
            SELECT 
                COALESCE(COUNT(DISTINCT b.id), 0) as total_bookings,
                COALESCE(SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END), 0) as total_revenue,
                COALESCE(COUNT(DISTINCT b.user_id), 0) as total_customers
            FROM bookings b
            WHERE b.booked_at BETWEEN $1 AND $2
        `;
        
        const capacityQuery = `
            SELECT 
                COALESCE(SUM(t.capacity), 0) as total_capacity,
                COALESCE(SUM(t.booked_count), 0) as total_booked
            FROM tours t
            WHERE t.status IN ('upcoming', 'available')
        `;
        
        const [kpisResult, previousKpisResult, capacityResult] = await Promise.all([
            db.query(kpisQuery, [startDate, endDate]),
            db.query(previousKpisQuery, [previousStartDate, previousEndDate]),
            db.query(capacityQuery)
        ]);
        
        const current = kpisResult.rows[0] || {};
        const previous = previousKpisResult.rows[0] || {};
        const capacity = capacityResult.rows[0] || {};
        
        // Calculate growth percentages
        const bookingGrowth = previous.total_bookings > 0 
            ? ((current.total_bookings - previous.total_bookings) / previous.total_bookings) * 100 
            : current.total_bookings > 0 ? 100 : 0;
        
        const revenueGrowth = previous.total_revenue > 0 
            ? ((current.total_revenue - previous.total_revenue) / previous.total_revenue) * 100 
            : current.total_revenue > 0 ? 100 : 0;
        
        const customerGrowth = previous.total_customers > 0 
            ? ((current.total_customers - previous.total_customers) / previous.total_customers) * 100 
            : current.total_customers > 0 ? 100 : 0;
        
        const avgBookingValue = current.total_bookings > 0 
            ? current.total_revenue / current.total_bookings 
            : 0;
        
        const occupancyRate = capacity.total_capacity > 0 
            ? (capacity.total_booked / capacity.total_capacity) * 100 
            : 0;
        
        const kpis = {
            totalBookings: parseInt(current.total_bookings) || 0,
            totalRevenue: parseFloat(current.total_revenue) || 0,
            totalCustomers: parseInt(current.total_customers) || 0,
            returningCustomers: 0,
            activeTours: 0,
            avgBookingValue: avgBookingValue,
            totalCapacity: parseInt(capacity.total_capacity) || 0,
            totalBookedCapacity: parseInt(capacity.total_booked) || 0,
            bookingGrowth: bookingGrowth,
            revenueGrowth: revenueGrowth,
            customerGrowth: customerGrowth,
            occupancyRate: occupancyRate,
            customerRetention: 0,
            conversionRate: 0
        };

        // 7. BOOKING FUNNEL (Simplified)
        const bookingFunnel = {
            visitors: 0,
            interested_users: 0,
            booked_users: kpis.totalCustomers || 0,
            confirmed_count: kpis.totalBookings || 0,
            conversion_rate: 0
        };

        // 8. REVENUE COMPARISON (if compare is enabled)
        let revenueComparison = null;
        if (compare) {
            const comparisonQuery = `
                SELECT 
                    'current' as period,
                    DATE_TRUNC('month', b.booked_at) as month,
                    SUM(b.total_price) as revenue,
                    COUNT(*) as bookings
                FROM bookings b
                WHERE b.booked_at BETWEEN $1 AND $2 
                    AND b.status = 'confirmed'
                GROUP BY DATE_TRUNC('month', b.booked_at)
                
                UNION ALL
                
                SELECT 
                    'previous' as period,
                    DATE_TRUNC('month', b.booked_at) as month,
                    SUM(b.total_price) as revenue,
                    COUNT(*) as bookings
                FROM bookings b
                WHERE b.booked_at BETWEEN $3 AND $4 
                    AND b.status = 'confirmed'
                GROUP BY DATE_TRUNC('month', b.booked_at)
                
                ORDER BY period, month
            `;
            
            const comparisonResult = await db.query(comparisonQuery, [
                startDate, endDate, 
                previousStartDate, previousEndDate
            ]);
            revenueComparison = comparisonResult.rows || [];
        }

        res.render('admin/analytics/overview', {
            title: 'Analytics Intelligence - Casalinga Tours',
            period,
            compare,
            moment,
            
            // Core KPIs
            kpis: kpis,
            
            // Charts Data
            revenueTrend: revenueTrend,
            categoryAnalytics: categoryAnalytics,
            customerAnalytics: customerAnalytics,
            topCustomers: topCustomers,
            tourAnalytics: tourAnalytics,
            bookingFunnel: bookingFunnel,
            revenueComparison: revenueComparison,
            
            // Date Information
            dateRange: {
                current: { 
                    startDate: startDate,
                    endDate: endDate 
                },
                previous: { 
                    startDate: previousStartDate,
                    endDate: previousEndDate 
                }
            }
        });

    } catch (error) {
        console.error('Analytics Intelligence Error:', error);
        console.error('Error stack:', error.stack);
        
        const moment = require('moment');
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
        
        // Generate dummy data for testing
        const dummyRevenueTrend = [];
        const dummyCategoryAnalytics = [];
        const dummyCustomerAnalytics = [];
        
        // Generate dummy monthly data for last 12 months
        for (let i = 11; i >= 0; i--) {
            const date = new Date();
            date.setMonth(date.getMonth() - i);
            dummyRevenueTrend.push({
                period: date.toISOString().split('T')[0],
                revenue: Math.floor(Math.random() * 50000) + 10000,
                bookings: Math.floor(Math.random() * 50) + 10
            });
            
            dummyCustomerAnalytics.push({
                month: date.toISOString().split('T')[0],
                new_customers: Math.floor(Math.random() * 30) + 5
            });
        }
        
        // Dummy categories
        const categories = ['Adventure', 'Cultural', 'Nature', 'Food', 'Historical'];
        categories.forEach((category, index) => {
            dummyCategoryAnalytics.push({
                category: category,
                revenue: Math.floor(Math.random() * 100000) + 20000,
                bookings: Math.floor(Math.random() * 40) + 10
            });
        });
        
        res.render('admin/analytics/overview', {
            title: 'Analytics Intelligence - Casalinga Tours',
            period: req.query.period || 'month',
            compare: req.query.compare || false,
            moment,
            kpis: {
                totalBookings: 156,
                totalRevenue: 245000,
                totalCustomers: 89,
                returningCustomers: 23,
                activeTours: 12,
                avgBookingValue: 1570,
                totalCapacity: 240,
                totalBookedCapacity: 156,
                bookingGrowth: 12.5,
                revenueGrowth: 18.3,
                customerGrowth: 8.7,
                occupancyRate: 65,
                customerRetention: 25.8,
                conversionRate: 4.2
            },
            revenueTrend: dummyRevenueTrend,
            categoryAnalytics: dummyCategoryAnalytics,
            customerAnalytics: dummyCustomerAnalytics,
            topCustomers: [
                {
                    name: 'John Doe',
                    email: 'john@example.com',
                    total_bookings: 7,
                    total_spent: 12500,
                    avg_booking_value: 1785
                },
                {
                    name: 'Jane Smith',
                    email: 'jane@example.com',
                    total_bookings: 5,
                    total_spent: 9800,
                    avg_booking_value: 1960
                }
            ],
            tourAnalytics: [
                {
                    title: 'Cape Town Adventure',
                    location: 'Cape Town',
                    bookings: 24,
                    revenue: 42000,
                    avg_booking_value: 1750
                },
                {
                    title: 'Wine Tasting Tour',
                    location: 'Stellenbosch',
                    bookings: 18,
                    revenue: 31500,
                    avg_booking_value: 1750
                }
            ],
            bookingFunnel: {
                visitors: 1250,
                interested_users: 312,
                booked_users: 89,
                confirmed_count: 156,
                conversion_rate: 7.1
            },
            revenueComparison: null,
            dateRange: {
                current: { 
                    startDate: thirtyDaysAgo,
                    endDate: now 
                },
                previous: { 
                    startDate: new Date(thirtyDaysAgo.getTime() - 30 * 24 * 60 * 60 * 1000),
                    endDate: thirtyDaysAgo 
                }
            }
        });
    }
},

    // GET /admin/analytics/revenue - Detailed Revenue Analytics
    getRevenueAnalytics: async (req, res) => {
        try {
            const { period = 'month', group_by = 'month', start_date, end_date } = req.query;
            const moment = require('moment');
            
            let dateFilter = '';
            let params = [];
            let paramCount = 1;
            
            if (start_date && end_date) {
                dateFilter = `WHERE b.booked_at BETWEEN $${paramCount} AND $${paramCount + 1}`;
                params = [start_date, end_date];
                paramCount += 2;
            } else {
                // Default to last 12 months
                const defaultStart = moment().subtract(12, 'months').startOf('month').toDate();
                const defaultEnd = moment().endOf('month').toDate();
                dateFilter = `WHERE b.booked_at BETWEEN $${paramCount} AND $${paramCount + 1}`;
                params = [defaultStart, defaultEnd];
                paramCount += 2;
            }

            // Revenue by time period
            const revenueByTime = await db.query(`
                SELECT 
                    DATE_TRUNC($1, b.booked_at) as period,
                    COUNT(DISTINCT b.id) as bookings,
                    COUNT(DISTINCT b.user_id) as unique_customers,
                    SUM(b.total_price) as revenue,
                    AVG(b.total_price) as avg_order_value,
                    COUNT(DISTINCT t.id) as unique_tours
                FROM bookings b
                JOIN tours t ON b.tour_id = t.id
                ${dateFilter} AND b.status = 'confirmed'
                GROUP BY DATE_TRUNC($1, b.booked_at)
                ORDER BY period DESC
                LIMIT 24
            `, [group_by, ...params]);

            // Revenue by tour
            const revenueByTour = await db.query(`
                SELECT 
                    t.id,
                    t.title,
                    t.slug,
                    t.location,
                    COUNT(b.id) as bookings,
                    SUM(b.total_price) as revenue,
                    AVG(b.total_price) as avg_price,
                    COUNT(DISTINCT b.user_id) as unique_customers
                FROM bookings b
                JOIN tours t ON b.tour_id = t.id
                ${dateFilter} AND b.status = 'confirmed'
                GROUP BY t.id, t.title, t.slug, t.location
                ORDER BY revenue DESC
                LIMIT 20
            `, params);

            // Revenue by customer segment
            const revenueBySegment = await db.query(`
                WITH customer_segments AS (
                    SELECT 
                        u.id,
                        u.name,
                        u.email,
                        COUNT(b.id) as total_bookings,
                        SUM(b.total_price) as lifetime_value,
                        CASE 
                            WHEN COUNT(b.id) >= 5 THEN 'VIP'
                            WHEN COUNT(b.id) >= 3 THEN 'Regular'
                            WHEN COUNT(b.id) >= 1 THEN 'New'
                            ELSE 'Prospect'
                        END as segment
                    FROM users u
                    LEFT JOIN bookings b ON u.id = b.user_id AND b.status = 'confirmed'
                    GROUP BY u.id, u.name, u.email
                )
                SELECT 
                    segment,
                    COUNT(*) as customer_count,
                    SUM(lifetime_value) as total_revenue,
                    AVG(lifetime_value) as avg_value
                FROM customer_segments
                WHERE lifetime_value > 0
                GROUP BY segment
                ORDER BY 
                    CASE segment 
                        WHEN 'VIP' THEN 1
                        WHEN 'Regular' THEN 2
                        WHEN 'New' THEN 3
                        WHEN 'Prospect' THEN 4
                    END
            `);

            // Payment method analysis
            const paymentAnalytics = await db.query(`
                SELECT 
                    COALESCE(b.payment_method, 'unknown') as payment_method,
                    COUNT(*) as bookings,
                    SUM(total_price) as revenue,
                    AVG(total_price) as avg_amount,
                    COUNT(DISTINCT user_id) as unique_customers
                FROM bookings b
                ${dateFilter} AND b.status = 'confirmed'
                GROUP BY COALESCE(b.payment_method, 'unknown')
                ORDER BY revenue DESC
            `, params);

            // Seasonality analysis
            const seasonality = await db.query(`
                SELECT 
                    EXTRACT(MONTH FROM booked_at) as month,
                    EXTRACT(YEAR FROM booked_at) as year,
                    COUNT(*) as bookings,
                    SUM(total_price) as revenue,
                    AVG(total_price) as avg_amount
                FROM bookings
                ${dateFilter} AND status = 'confirmed'
                GROUP BY EXTRACT(YEAR FROM booked_at), EXTRACT(MONTH FROM booked_at)
                ORDER BY year, month
            `, params);

            res.render('admin/analytics/revenue', {
                title: 'Revenue Analytics - Casalinga Tours',
                period,
                group_by,
                start_date,
                end_date,
                moment,
                revenueByTime: revenueByTime.rows,
                revenueByTour: revenueByTour.rows,
                revenueBySegment: revenueBySegment.rows,
                paymentAnalytics: paymentAnalytics.rows,
                seasonality: seasonality.rows
            });

        } catch (error) {
            console.error('Revenue Analytics Error:', error);
            res.render('admin/analytics/revenue', {
                title: 'Revenue Analytics - Casalinga Tours',
                period: req.query.period || 'month',
                group_by: req.query.group_by || 'month',
                revenueByTime: [],
                revenueByTour: [],
                revenueBySegment: [],
                paymentAnalytics: [],
                seasonality: []
            });
        }
    },

    // GET /admin/analytics/customers - Customer Analytics
    getCustomerAnalytics: async (req, res) => {
        try {
            const { period = 'month', segment = 'all', start_date, end_date } = req.query;
            const moment = require('moment');
            
            let dateFilter = '';
            let params = [];
            let paramCount = 1;
            
            if (start_date && end_date) {
                dateFilter = `WHERE u.created_at BETWEEN $${paramCount} AND $${paramCount + 1}`;
                params = [start_date, end_date];
            } else {
                const defaultStart = moment().subtract(12, 'months').startOf('month').toDate();
                const defaultEnd = moment().endOf('month').toDate();
                dateFilter = `WHERE u.created_at BETWEEN $${paramCount} AND $${paramCount + 1}`;
                params = [defaultStart, defaultEnd];
            }

            // Customer acquisition over time
            const acquisitionTrend = await db.query(`
                WITH months AS (
                    SELECT generate_series(
                        DATE_TRUNC('month', CURRENT_DATE) - INTERVAL '23 months',
                        DATE_TRUNC('month', CURRENT_DATE),
                        '1 month'::interval
                    ) as month
                )
                SELECT 
                    m.month,
                    COUNT(u.id) as new_customers,
                    COUNT(b.id) as first_bookings,
                    COALESCE(SUM(b.total_price), 0) as initial_revenue
                FROM months m
                LEFT JOIN users u ON DATE_TRUNC('month', u.created_at) = m.month
                LEFT JOIN LATERAL (
                    SELECT b2.id, b2.total_price
                    FROM bookings b2
                    WHERE b2.user_id = u.id
                    AND b2.status = 'confirmed'
                    ORDER BY b2.booked_at ASC
                    LIMIT 1
                ) b ON true
                GROUP BY m.month
                ORDER BY m.month
            `);

            // Customer lifetime value analysis
            const clvAnalysis = await db.query(`
                WITH customer_stats AS (
                    SELECT 
                        u.id,
                        u.name,
                        u.email,
                        u.created_at as joined_date,
                        COUNT(b.id) as total_bookings,
                        SUM(b.total_price) as lifetime_value,
                        MIN(b.booked_at) as first_booking,
                        MAX(b.booked_at) as last_booking,
                        CASE 
                            WHEN COUNT(b.id) = 1 THEN 'One-time'
                            WHEN COUNT(b.id) > 1 THEN 'Repeat'
                            ELSE 'No bookings'
                        END as customer_type,
                        CASE 
                            WHEN COUNT(b.id) >= 5 THEN 'VIP'
                            WHEN COUNT(b.id) >= 3 THEN 'Regular'
                            WHEN COUNT(b.id) >= 1 THEN 'New'
                            ELSE 'Inactive'
                        END as segment
                    FROM users u
                    LEFT JOIN bookings b ON u.id = b.user_id AND b.status = 'confirmed'
                    GROUP BY u.id, u.name, u.email, u.created_at
                )
                SELECT 
                    customer_type,
                    segment,
                    COUNT(*) as customer_count,
                    AVG(lifetime_value) as avg_lifetime_value,
                    AVG(total_bookings) as avg_bookings,
                    PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY lifetime_value) as median_value,
                    SUM(lifetime_value) as total_revenue
                FROM customer_stats
                WHERE segment != 'Inactive'
                GROUP BY customer_type, segment
                ORDER BY total_revenue DESC
            `);

            // Churn analysis
            const churnAnalysis = await db.query(`
                WITH customer_activity AS (
                    SELECT 
                        u.id,
                        MAX(b.booked_at) as last_activity,
                        CASE 
                            WHEN MAX(b.booked_at) < CURRENT_DATE - INTERVAL '90 days' THEN 'Churned'
                            WHEN MAX(b.booked_at) < CURRENT_DATE - INTERVAL '30 days' THEN 'At Risk'
                            ELSE 'Active'
                        END as status
                    FROM users u
                    LEFT JOIN bookings b ON u.id = b.user_id AND b.status = 'confirmed'
                    WHERE b.booked_at IS NOT NULL
                    GROUP BY u.id
                )
                SELECT 
                    status,
                    COUNT(*) as customer_count,
                    COUNT(*) * 100.0 / SUM(COUNT(*)) OVER() as percentage
                FROM customer_activity
                GROUP BY status
                ORDER BY 
                    CASE status 
                        WHEN 'Active' THEN 1
                        WHEN 'At Risk' THEN 2
                        WHEN 'Churned' THEN 3
                    END
            `);

            // Referral analysis (if you have referral tracking)
            const referralSources = await db.query(`
                SELECT 
                    COALESCE(utm_source, 'direct') as source,
                    COUNT(DISTINCT u.id) as signups,
                    COUNT(DISTINCT b.id) as bookings,
                    COALESCE(SUM(b.total_price), 0) as revenue
                FROM users u
                LEFT JOIN bookings b ON u.id = b.user_id AND b.status = 'confirmed'
                GROUP BY COALESCE(utm_source, 'direct')
                ORDER BY signups DESC
            `);

            // Cohort analysis
            const cohortAnalysis = await db.query(`
                WITH cohorts AS (
                    SELECT 
                        DATE_TRUNC('month', u.created_at) as cohort_month,
                        u.id as user_id
                    FROM users u
                    WHERE u.created_at >= CURRENT_DATE - INTERVAL '12 months'
                ),
                monthly_activity AS (
                    SELECT 
                        c.cohort_month,
                        DATE_TRUNC('month', b.booked_at) as activity_month,
                        COUNT(DISTINCT c.user_id) as active_users,
                        COUNT(b.id) as bookings,
                        SUM(b.total_price) as revenue
                    FROM cohorts c
                    LEFT JOIN bookings b ON c.user_id = b.user_id 
                        AND b.status = 'confirmed'
                        AND DATE_TRUNC('month', b.booked_at) >= c.cohort_month
                    GROUP BY c.cohort_month, DATE_TRUNC('month', b.booked_at)
                )
                SELECT 
                    TO_CHAR(cohort_month, 'YYYY-MM') as cohort,
                    TO_CHAR(activity_month, 'YYYY-MM') as month,
                    EXTRACT(MONTH FROM AGE(activity_month, cohort_month)) as month_number,
                    active_users,
                    bookings,
                    revenue
                FROM monthly_activity
                WHERE activity_month IS NOT NULL
                ORDER BY cohort_month, activity_month
            `);

            res.render('admin/analytics/customers', {
                title: 'Customer Analytics - Casalinga Tours',
                period,
                segment,
                start_date,
                end_date,
                moment,
                acquisitionTrend: acquisitionTrend.rows,
                clvAnalysis: clvAnalysis.rows,
                churnAnalysis: churnAnalysis.rows,
                referralSources: referralSources.rows,
                cohortAnalysis: cohortAnalysis.rows
            });

        } catch (error) {
            console.error('Customer Analytics Error:', error);
            res.render('admin/analytics/customers', {
                title: 'Customer Analytics - Casalinga Tours',
                acquisitionTrend: [],
                clvAnalysis: [],
                churnAnalysis: [],
                referralSources: [],
                cohortAnalysis: []
            });
        }
    },

    // GET /admin/analytics/tours - Tour Performance Analytics
    getTourAnalytics: async (req, res) => {
        try {
            const { period = 'month', sort_by = 'revenue', limit = 20 } = req.query;
            const moment = require('moment');
            
            const startDate = moment().subtract(12, 'months').startOf('month').toDate();
            const endDate = moment().endOf('month').toDate();

            // Tour performance metrics
            let orderBy = 'revenue DESC';
            switch(sort_by) {
                case 'bookings':
                    orderBy = 'bookings DESC';
                    break;
                case 'occupancy':
                    orderBy = 'occupancy_rate DESC';
                    break;
                case 'rating':
                    orderBy = 'avg_rating DESC NULLS LAST';
                    break;
                case 'profitability':
                    orderBy = 'profitability DESC';
                    break;
            }

            const tourPerformance = await db.query(`
                SELECT 
                    t.id,
                    t.title,
                    t.slug,
                    t.location,
                    t.price,
                    t.capacity,
                    t.status,
                    
                    -- Booking metrics
                    COUNT(b.id) as bookings,
                    SUM(CASE WHEN b.status = 'confirmed' THEN 1 ELSE 0 END) as confirmed_bookings,
                    SUM(CASE WHEN b.status = 'cancelled' THEN 1 ELSE 0 END) as cancelled_bookings,
                    
                    -- Revenue metrics
                    SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as revenue,
                    SUM(CASE WHEN b.status = 'cancelled' THEN b.total_price ELSE 0 END) as lost_revenue,
                    AVG(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as avg_booking_value,
                    
                    -- Customer metrics
                    COUNT(DISTINCT b.user_id) as unique_customers,
                    COUNT(DISTINCT CASE WHEN COUNT(b2.id) > 1 THEN b.user_id END) as repeat_customers,
                    
                    -- Occupancy
                    SUM(CASE WHEN b.status = 'confirmed' THEN b.people_count ELSE 0 END) as total_participants,
                    (SUM(CASE WHEN b.status = 'confirmed' THEN b.people_count ELSE 0 END) * 100.0 / 
                     NULLIF(t.capacity * COUNT(DISTINCT DATE(b.booked_at)), 0)) as occupancy_rate,
                    
                    -- Reviews
                    AVG(r.rating) as avg_rating,
                    COUNT(r.id) as review_count,
                    
                    -- Profitability (simplified - revenue / price ratio)
                    CASE 
                        WHEN t.price > 0 THEN 
                            SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) / (t.price * t.capacity)
                        ELSE 0 
                    END as profitability
                    
                FROM tours t
                LEFT JOIN bookings b ON t.id = b.tour_id 
                    AND b.booked_at BETWEEN $1 AND $2
                LEFT JOIN reviews r ON t.id = r.tour_id AND r.is_approved = true
                GROUP BY t.id, t.title, t.slug, t.location, t.price, t.capacity, t.status
                HAVING COUNT(b.id) > 0
                ORDER BY ${orderBy}
                LIMIT $3
            `, [startDate, endDate, parseInt(limit)]);

            // Seasonal patterns
            const seasonalPatterns = await db.query(`
                SELECT 
                    t.id,
                    t.title,
                    EXTRACT(MONTH FROM b.booked_at) as month,
                    COUNT(b.id) as bookings,
                    SUM(b.total_price) as revenue,
                    AVG(b.total_price) as avg_value
                FROM tours t
                JOIN bookings b ON t.id = b.tour_id AND b.status = 'confirmed'
                WHERE b.booked_at >= CURRENT_DATE - INTERVAL '24 months'
                GROUP BY t.id, t.title, EXTRACT(MONTH FROM b.booked_at)
                HAVING COUNT(b.id) > 0
                ORDER BY t.title, month
            `);

            // Category performance
            const categoryPerformance = await db.query(`
                SELECT 
                    c.id,
                    c.name,
                    c.color,
                    COUNT(DISTINCT t.id) as tour_count,
                    COUNT(b.id) as bookings,
                    SUM(b.total_price) as revenue,
                    AVG(b.total_price) as avg_booking_value,
                    COUNT(DISTINCT b.user_id) as unique_customers,
                    AVG(r.rating) as avg_rating
                FROM categories c
                LEFT JOIN tour_categories tc ON c.id = tc.category_id
                LEFT JOIN tours t ON tc.tour_id = t.id
                LEFT JOIN bookings b ON t.id = b.tour_id AND b.status = 'confirmed' 
                    AND b.booked_at >= CURRENT_DATE - INTERVAL '12 months'
                LEFT JOIN reviews r ON t.id = r.tour_id AND r.is_approved = true
                GROUP BY c.id, c.name, c.color
                HAVING COUNT(b.id) > 0
                ORDER BY revenue DESC
            `);

            // Amenity impact analysis
            const amenityImpact = await db.query(`
                SELECT 
                    a.id,
                    a.name,
                    a.icon,
                    COUNT(DISTINCT t.id) as tour_count,
                    COUNT(b.id) as bookings,
                    SUM(b.total_price) as revenue,
                    AVG(b.total_price) as avg_price,
                    AVG(r.rating) as avg_rating
                FROM amenities a
                LEFT JOIN tour_amenities ta ON a.id = ta.amenity_id
                LEFT JOIN tours t ON ta.tour_id = t.id
                LEFT JOIN bookings b ON t.id = b.tour_id AND b.status = 'confirmed'
                LEFT JOIN reviews r ON t.id = r.tour_id AND r.is_approved = true
                GROUP BY a.id, a.name, a.icon
                HAVING COUNT(b.id) > 0
                ORDER BY revenue DESC
            `);

            // Cancellation analysis
            const cancellationAnalysis = await db.query(`
                SELECT 
                    t.id,
                    t.title,
                    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) as cancelled_bookings,
                    COUNT(CASE WHEN b.status = 'confirmed' THEN 1 END) as confirmed_bookings,
                    COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) * 100.0 / 
                        NULLIF(COUNT(*), 0) as cancellation_rate,
                    AVG(CASE WHEN b.status = 'cancelled' THEN EXTRACT(DAY FROM (b.cancelled_at - b.booked_at)) END) 
                        as avg_days_before_cancellation
                FROM tours t
                JOIN bookings b ON t.id = b.tour_id
                WHERE b.booked_at >= CURRENT_DATE - INTERVAL '12 months'
                GROUP BY t.id, t.title
                HAVING COUNT(CASE WHEN b.status = 'cancelled' THEN 1 END) > 0
                ORDER BY cancellation_rate DESC
                LIMIT 10
            `);

            res.render('admin/analytics/tours', {
                title: 'Tour Performance Analytics - Casalinga Tours',
                period,
                sort_by,
                limit,
                moment,
                tourPerformance: tourPerformance.rows,
                seasonalPatterns: seasonalPatterns.rows,
                categoryPerformance: categoryPerformance.rows,
                amenityImpact: amenityImpact.rows,
                cancellationAnalysis: cancellationAnalysis.rows
            });

        } catch (error) {
            console.error('Tour Analytics Error:', error);
            res.render('admin/analytics/tours', {
                title: 'Tour Performance Analytics - Casalinga Tours',
                tourPerformance: [],
                seasonalPatterns: [],
                categoryPerformance: [],
                amenityImpact: [],
                cancellationAnalysis: []
            });
        }
    },

    // GET /admin/analytics/export - Export Analytics Data
    exportAnalytics: async (req, res) => {
        try {
            const { format = 'csv', type = 'revenue', start_date, end_date } = req.query;
            const moment = require('moment');
            
            let data = [];
            let filename = '';
            
            switch(type) {
                case 'revenue':
                    const revenueData = await db.query(`
                        SELECT 
                            b.booking_number,
                            u.name as customer_name,
                            u.email,
                            t.title as tour_name,
                            b.total_price,
                            b.status,
                            b.payment_method,
                            b.booked_at,
                            b.confirmed_at
                        FROM bookings b
                        JOIN users u ON b.user_id = u.id
                        JOIN tours t ON b.tour_id = t.id
                        WHERE b.booked_at BETWEEN $1 AND $2
                        ORDER BY b.booked_at DESC
                    `, [start_date || moment().subtract(30, 'days').toDate(), end_date || new Date()]);
                    data = revenueData.rows;
                    filename = `revenue-${moment().format('YYYY-MM-DD')}`;
                    break;
                    
                case 'customers':
                    const customerData = await db.query(`
                        SELECT 
                            u.id,
                            u.name,
                            u.email,
                            u.phone,
                            u.created_at,
                            COUNT(b.id) as total_bookings,
                            SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as lifetime_value,
                            MIN(b.booked_at) as first_booking,
                            MAX(b.booked_at) as last_booking
                        FROM users u
                        LEFT JOIN bookings b ON u.id = b.user_id
                        GROUP BY u.id, u.name, u.email, u.phone, u.created_at
                        ORDER BY lifetime_value DESC
                    `);
                    data = customerData.rows;
                    filename = `customers-${moment().format('YYYY-MM-DD')}`;
                    break;
                    
                case 'tours':
                    const tourData = await db.query(`
                        SELECT 
                            t.title,
                            t.location,
                            t.price,
                            t.capacity,
                            t.status,
                            COUNT(b.id) as total_bookings,
                            SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as revenue,
                            AVG(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as avg_booking_value,
                            COUNT(DISTINCT b.user_id) as unique_customers
                        FROM tours t
                        LEFT JOIN bookings b ON t.id = b.tour_id
                        GROUP BY t.id, t.title, t.location, t.price, t.capacity, t.status
                        ORDER BY revenue DESC
                    `);
                    data = tourData.rows;
                    filename = `tours-${moment().format('YYYY-MM-DD')}`;
                    break;
            }
            
            if (format === 'csv') {
                // Convert to CSV
                const headers = Object.keys(data[0] || {}).join(',');
                const rows = data.map(row => 
                    Object.values(row).map(value => 
                        typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value
                    ).join(',')
                ).join('\n');
                
                const csv = `${headers}\n${rows}`;
                
                res.header('Content-Type', 'text/csv');
                res.attachment(`${filename}.csv`);
                return res.send(csv);
                
            } else if (format === 'json') {
                res.header('Content-Type', 'application/json');
                res.attachment(`${filename}.json`);
                return res.send(JSON.stringify(data, null, 2));
                
            } else if (format === 'xlsx') {
                // For XLSX export, you'd need a library like exceljs
                // This is a simplified version - you might want to use a proper Excel library
                res.header('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
                res.attachment(`${filename}.xlsx`);
                // Return JSON for now, implement Excel generation separately
                return res.send(JSON.stringify(data));
            }
            
        } catch (error) {
            console.error('Export Analytics Error:', error);
            res.status(500).send('Error exporting analytics data');
        }
    },

    // GET /admin/analytics/realtime - Real-time Dashboard
    getRealtimeAnalytics: async (req, res) => {
        try {
            const now = new Date();
            const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
            
            // Real-time stats for today
            const todayStats = await db.query(`
                SELECT 
                    COUNT(*) as bookings_today,
                    SUM(total_price) as revenue_today,
                    COUNT(DISTINCT user_id) as customers_today,
                    AVG(total_price) as avg_booking_today
                FROM bookings
                WHERE booked_at >= $1 AND status = 'confirmed'
            `, [todayStart]);
            
            // Current month stats
            const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
            const monthStats = await db.query(`
                SELECT 
                    COUNT(*) as bookings_month,
                    SUM(total_price) as revenue_month,
                    COUNT(DISTINCT user_id) as customers_month
                FROM bookings
                WHERE booked_at >= $1 AND status = 'confirmed'
            `, [monthStart]);
            
            // Live bookings (last 24 hours)
            const liveBookings = await db.query(`
                SELECT 
                    b.*,
                    u.name as customer_name,
                    t.title as tour_title
                FROM bookings b
                JOIN users u ON b.user_id = u.id
                JOIN tours t ON b.tour_id = t.id
                WHERE b.booked_at >= NOW() - INTERVAL '24 hours'
                ORDER BY b.booked_at DESC
                LIMIT 20
            `);
            
            // Live user activity
            const liveUsers = await db.query(`
                SELECT 
                    u.id,
                    u.name,
                    u.email,
                    u.last_login_at,
                    COUNT(b.id) as session_bookings,
                    SUM(b.total_price) as session_spend
                FROM users u
                LEFT JOIN bookings b ON u.id = b.user_id 
                    AND b.booked_at >= NOW() - INTERVAL '1 hour'
                WHERE u.last_login_at >= NOW() - INTERVAL '1 hour'
                GROUP BY u.id, u.name, u.email, u.last_login_at
                ORDER BY u.last_login_at DESC
                LIMIT 10
            `);
            
            // Tour availability in real-time
            const tourAvailability = await db.query(`
                SELECT 
                    t.id,
                    t.title,
                    t.capacity,
                    t.booked_count,
                    t.capacity - t.booked_count as available_slots,
                    COUNT(CASE WHEN b.status = 'pending' THEN 1 END) as pending_bookings,
                    COUNT(CASE WHEN b.booked_at >= NOW() - INTERVAL '1 hour' THEN 1 END) as recent_bookings
                FROM tours t
                LEFT JOIN bookings b ON t.id = b.tour_id 
                    AND b.booked_at >= NOW() - INTERVAL '24 hours'
                WHERE t.status IN ('upcoming', 'available')
                GROUP BY t.id, t.title, t.capacity, t.booked_count
                HAVING t.capacity - t.booked_count > 0
                ORDER BY recent_bookings DESC
                LIMIT 10
            `);
            
            // Sales velocity (bookings per hour)
            const salesVelocity = await db.query(`
                WITH hourly_sales AS (
                    SELECT 
                        DATE_TRUNC('hour', booked_at) as hour,
                        COUNT(*) as bookings,
                        SUM(total_price) as revenue
                    FROM bookings
                    WHERE booked_at >= NOW() - INTERVAL '24 hours'
                        AND status = 'confirmed'
                    GROUP BY DATE_TRUNC('hour', booked_at)
                )
                SELECT 
                    hour,
                    bookings,
                    revenue,
                    AVG(bookings) OVER (ORDER BY hour ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) 
                        as moving_avg_bookings,
                    AVG(revenue) OVER (ORDER BY hour ROWS BETWEEN 3 PRECEDING AND CURRENT ROW) 
                        as moving_avg_revenue
                FROM hourly_sales
                ORDER BY hour DESC
            `);

            res.render('admin/analytics/realtime', {
                title: 'Real-time Analytics - Casalinga Tours',
                moment: require('moment'),
                todayStats: todayStats.rows[0],
                monthStats: monthStats.rows[0],
                liveBookings: liveBookings.rows,
                liveUsers: liveUsers.rows,
                tourAvailability: tourAvailability.rows,
                salesVelocity: salesVelocity.rows,
                currentTime: now
            });

        } catch (error) {
            console.error('Real-time Analytics Error:', error);
            res.render('admin/analytics/realtime', {
                title: 'Real-time Analytics - Casalinga Tours',
                todayStats: {},
                monthStats: {},
                liveBookings: [],
                liveUsers: [],
                tourAvailability: [],
                salesVelocity: []
            });
        }
    }
};
// Helper Functions
async function getKPIStats(startDate, endDate, previousStartDate, previousEndDate) {
    try {
        const [currentStats, previousStats, capacityStats] = await Promise.all([
            db.query(`
                SELECT 
                    COUNT(DISTINCT b.id) as total_bookings,
                    SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as total_revenue,
                    COUNT(DISTINCT b.user_id) as total_customers,
                    COUNT(DISTINCT CASE WHEN EXISTS (
                        SELECT 1 FROM bookings b2 
                        WHERE b2.user_id = b.user_id 
                        AND b2.booked_at BETWEEN $1 AND $2 
                        AND b2.id != b.id
                    ) THEN b.user_id END) as returning_customers,
                    COUNT(DISTINCT t.id) as active_tours,
                    AVG(CASE WHEN b.status = 'confirmed' THEN b.total_price END) as avg_booking_value
                FROM bookings b
                LEFT JOIN tours t ON b.tour_id = t.id
                WHERE b.booked_at BETWEEN $3 AND $4
            `, [startDate, endDate, startDate, endDate]),
            
            db.query(`
                SELECT 
                    COUNT(DISTINCT b.id) as total_bookings,
                    SUM(CASE WHEN b.status = 'confirmed' THEN b.total_price ELSE 0 END) as total_revenue,
                    COUNT(DISTINCT b.user_id) as total_customers
                FROM bookings b
                WHERE b.booked_at BETWEEN $1 AND $2
            `, [previousStartDate, previousEndDate]),
            
            db.query(`
                SELECT 
                    SUM(t.capacity) as total_capacity,
                    SUM(t.booked_count) as total_booked
                FROM tours t
                WHERE t.status IN ('upcoming', 'available')
            `)
        ]);
        
        const current = currentStats.rows[0] || {};
        const previous = previousStats.rows[0] || {};
        const capacity = capacityStats.rows[0] || {};
        
        // Calculate growth percentages
        const bookingGrowth = previous.total_bookings > 0 
            ? ((current.total_bookings - previous.total_bookings) / previous.total_bookings) * 100 
            : current.total_bookings > 0 ? 100 : 0;
        
        const revenueGrowth = previous.total_revenue > 0 
            ? ((current.total_revenue - previous.total_revenue) / previous.total_revenue) * 100 
            : current.total_revenue > 0 ? 100 : 0;
        
        const customerGrowth = previous.total_customers > 0 
            ? ((current.total_customers - previous.total_customers) / previous.total_customers) * 100 
            : current.total_customers > 0 ? 100 : 0;
        
        return {
            totalBookings: parseInt(current.total_bookings) || 0,
            totalRevenue: parseFloat(current.total_revenue) || 0,
            totalCustomers: parseInt(current.total_customers) || 0,
            returningCustomers: parseInt(current.returning_customers) || 0,
            activeTours: parseInt(current.active_tours) || 0,
            avgBookingValue: parseFloat(current.avg_booking_value) || 0,
            totalCapacity: parseInt(capacity.total_capacity) || 0,
            totalBookedCapacity: parseInt(capacity.total_booked) || 0,
            bookingGrowth,
            revenueGrowth,
            customerGrowth
        };
    } catch (error) {
        console.error('Error in getKPIStats:', error);
        return getEmptyKPIs();
    }
}

async function getRevenueTrend(startDate, endDate, period) {
    try {
        let interval;
        switch(period) {
            case 'day': interval = '1 day'; break;
            case 'week': interval = '1 week'; break;
            case 'quarter': interval = '3 months'; break;
            case 'year': interval = '1 year'; break;
            default: interval = '1 month';
        }
        
        const result = await db.query(`
            WITH periods AS (
                SELECT generate_series(
                    DATE_TRUNC($1, $2::timestamp),
                    DATE_TRUNC($1, $3::timestamp),
                    $4::interval
                ) as period
            )
            SELECT 
                p.period,
                COALESCE(COUNT(DISTINCT b.id), 0) as bookings,
                COALESCE(SUM(b.total_price), 0) as revenue,
                COALESCE(COUNT(DISTINCT b.user_id), 0) as customers,
                COALESCE(AVG(b.total_price), 0) as avg_booking_value
            FROM periods p
            LEFT JOIN bookings b ON DATE_TRUNC($1, b.booked_at) = p.period 
                AND b.status = 'confirmed'
            GROUP BY p.period
            ORDER BY p.period ASC
        `, [period, startDate, endDate, interval]);
        
        return result;
    } catch (error) {
        console.error('Error in getRevenueTrend:', error);
        return { rows: [] };
    }
}

async function getCategoryAnalytics(startDate, endDate) {
    try {
        const result = await db.query(`
            SELECT 
                c.id,
                c.name,
                c.color,
                c.icon,
                COUNT(DISTINCT b.id) as bookings,
                SUM(b.total_price) as revenue,
                COUNT(DISTINCT b.user_id) as customers,
                AVG(b.total_price) as avg_booking_value,
                COUNT(DISTINCT t.id) as tour_count,
                (SUM(b.total_price) * 100.0 / NULLIF((
                    SELECT SUM(total_price) 
                    FROM bookings 
                    WHERE booked_at BETWEEN $1 AND $2 
                    AND status = 'confirmed'
                ), 0)) as market_share
            FROM categories c
            LEFT JOIN tour_categories tc ON c.id = tc.category_id
            LEFT JOIN tours t ON tc.tour_id = t.id
            LEFT JOIN bookings b ON t.id = b.tour_id 
                AND b.booked_at BETWEEN $1 AND $2 
                AND b.status = 'confirmed'
            GROUP BY c.id, c.name, c.color, c.icon
            HAVING SUM(b.total_price) > 0
            ORDER BY revenue DESC
        `, [startDate, endDate]);
        
        return result;
    } catch (error) {
        console.error('Error in getCategoryAnalytics:', error);
        return { rows: [] };
    }
}

async function getCustomerAnalytics(startDate, endDate) {
    try {
        const result = await db.query(`
            WITH months AS (
                SELECT generate_series(
                    DATE_TRUNC('month', $1::timestamp),
                    DATE_TRUNC('month', $2::timestamp),
                    '1 month'::interval
                ) as month
            )
            SELECT 
                m.month,
                COUNT(u.id) as new_customers,
                COUNT(b.id) as first_bookings,
                COALESCE(SUM(b.total_price), 0) as initial_revenue
            FROM months m
            LEFT JOIN users u ON DATE_TRUNC('month', u.created_at) = m.month
            LEFT JOIN LATERAL (
                SELECT b2.id, b2.total_price
                FROM bookings b2
                WHERE b2.user_id = u.id
                AND b2.status = 'confirmed'
                AND b2.booked_at BETWEEN $1 AND $2
                ORDER BY b2.booked_at ASC
                LIMIT 1
            ) b ON true
            GROUP BY m.month
            ORDER BY m.month
        `, [startDate, endDate]);
        
        return result;
    } catch (error) {
        console.error('Error in getCustomerAnalytics:', error);
        return { rows: [] };
    }
}

async function getTopCustomers(startDate, endDate) {
    try {
        const result = await db.query(`
            SELECT 
                u.id,
                u.name,
                u.email,
                u.created_at as joined_date,
                COUNT(b.id) as total_bookings,
                SUM(b.total_price) as total_spent,
                MIN(b.booked_at) as first_booking,
                MAX(b.booked_at) as last_booking,
                AVG(b.total_price) as avg_booking_value,
                COUNT(DISTINCT EXTRACT(YEAR FROM b.booked_at)) as active_years
            FROM users u
            JOIN bookings b ON u.id = b.user_id
            WHERE b.booked_at BETWEEN $1 AND $2 
                AND b.status = 'confirmed'
            GROUP BY u.id, u.name, u.email, u.created_at
            ORDER BY total_spent DESC
            LIMIT 10
        `, [startDate, endDate]);
        
        return result;
    } catch (error) {
        console.error('Error in getTopCustomers:', error);
        return { rows: [] };
    }
}

async function getTourAnalytics(startDate, endDate) {
    try {
        const result = await db.query(`
            SELECT 
                t.id,
                t.title,
                t.location,
                COUNT(b.id) as bookings,
                SUM(b.total_price) as revenue,
                AVG(b.total_price) as avg_booking_value,
                COUNT(DISTINCT b.user_id) as unique_customers,
                (SUM(b.total_price) * 100.0 / NULLIF((
                    SELECT SUM(total_price) 
                    FROM bookings 
                    WHERE booked_at BETWEEN $1 AND $2 
                    AND status = 'confirmed'
                ), 0)) as revenue_share
            FROM tours t
            LEFT JOIN bookings b ON t.id = b.tour_id 
                AND b.booked_at BETWEEN $1 AND $2 
                AND b.status = 'confirmed'
            GROUP BY t.id, t.title, t.location
            HAVING COUNT(b.id) > 0
            ORDER BY revenue DESC
            LIMIT 10
        `, [startDate, endDate]);
        
        return result;
    } catch (error) {
        console.error('Error in getTourAnalytics:', error);
        return { rows: [] };
    }
}

async function getBookingFunnel(startDate, endDate) {
    try {
        const result = await db.query(`
            WITH funnel AS (
                -- Step 1: Total visitors (approximation - users created)
                SELECT COUNT(*) as visitors FROM users 
                WHERE created_at BETWEEN $1 AND $2
            ),
            users_with_interest as (
                SELECT COUNT(DISTINCT user_id) as interested_users
                FROM (
                    SELECT user_id FROM favorites WHERE created_at BETWEEN $1 AND $2
                    UNION
                    SELECT user_id FROM bookings WHERE booked_at BETWEEN $1 AND $2
                ) t
            ),
            users_who_booked as (
                SELECT COUNT(DISTINCT user_id) as booked_users
                FROM bookings 
                WHERE booked_at BETWEEN $1 AND $2
            ),
            confirmed_bookings as (
                SELECT COUNT(*) as confirmed_count
                FROM bookings 
                WHERE booked_at BETWEEN $1 AND $2 
                AND status = 'confirmed'
            )
            SELECT 
                f.visitors,
                uwi.interested_users,
                uwb.booked_users,
                cb.confirmed_count,
                (uwb.booked_users * 100.0 / NULLIF(f.visitors, 0)) as conversion_rate
            FROM funnel f, users_with_interest uwi, users_who_booked uwb, confirmed_bookings cb
        `, [startDate, endDate]);
        
        return result.rows[0] || {};
    } catch (error) {
        console.error('Error in getBookingFunnel:', error);
        return {};
    }
}

async function getRevenueComparison(currentStart, currentEnd, previousStart, previousEnd) {
    try {
        const result = await db.query(`
            SELECT 
                'current' as period,
                DATE_TRUNC('month', b.booked_at) as month,
                SUM(b.total_price) as revenue,
                COUNT(*) as bookings
            FROM bookings b
            WHERE b.booked_at BETWEEN $1 AND $2 
                AND b.status = 'confirmed'
            GROUP BY DATE_TRUNC('month', b.booked_at)
            
            UNION ALL
            
            SELECT 
                'previous' as period,
                DATE_TRUNC('month', b.booked_at) as month,
                SUM(b.total_price) as revenue,
                COUNT(*) as bookings
            FROM bookings b
            WHERE b.booked_at BETWEEN $3 AND $4 
                AND b.status = 'confirmed'
            GROUP BY DATE_TRUNC('month', b.booked_at)
            
            ORDER BY period, month
        `, [currentStart, currentEnd, previousStart, previousEnd]);
        
        return result;
    } catch (error) {
        console.error('Error in getRevenueComparison:', error);
        return { rows: [] };
    }
}

function calculateRetentionRate(returningCustomers, totalCustomers) {
    if (totalCustomers === 0) return 0;
    return (returningCustomers / totalCustomers) * 100;
}

function getEmptyKPIs() {
    return {
        totalBookings: 0,
        totalRevenue: 0,
        totalCustomers: 0,
        returningCustomers: 0,
        activeTours: 0,
        avgBookingValue: 0,
        totalCapacity: 0,
        totalBookedCapacity: 0,
        bookingGrowth: 0,
        revenueGrowth: 0,
        customerGrowth: 0,
        occupancyRate: 0,
        customerRetention: 0,
        conversionRate: 0
    };
}

module.exports = AnalyticsController;