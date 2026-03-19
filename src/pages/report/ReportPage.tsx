import React from 'react'
import { Navigate } from 'react-router-dom'
import { ROUTES } from '@lib/constants'

const ReportPage: React.FC = () => {
    return <Navigate to={ROUTES.REPORTS} replace />
}

export default ReportPage

