import { useState } from 'react'
import { Layout } from 'antd'
import './App.css'
import { HomeView } from './features/home/HomeView'
import { DashboardHeader } from './features/navigation/DashboardHeader'
import { DashboardMenu } from './features/navigation/DashboardMenu'
import {
  defaultGroupName,
  industryGroupParams,
  portfolioGroupParams,
} from './features/portfolio/constants'
import { PortfolioPage } from './features/portfolio'
import PortfolioTagManagementPage from './features/Tag'
import IndustryDiagramPage from './features/IndustryDiagram'
import { StrategyPage } from './features/strategy'
import type { ActiveMenuKey, GroupParams } from './types/portfolio'

const { Sider, Content } = Layout

function App() {
  const [activeMenu, setActiveMenu] = useState<ActiveMenuKey>('home')
  const [selectedGroup, setSelectedGroup] = useState(defaultGroupName)
  const [selectedGroupParams, setSelectedGroupParams] = useState<GroupParams>(portfolioGroupParams)

  const handleMenuClick = (key: string) => {
    if (key === 'home') {
      setActiveMenu('home')
      return
    }

    if (key === 'portfolio') {
      setActiveMenu('portfolio')
      setSelectedGroup(defaultGroupName)
      setSelectedGroupParams(portfolioGroupParams)
      return
    }

    if (key === 'strategy') {
      setActiveMenu('strategy')
      return
    }

    if (key === 'hangye') {
      setActiveMenu('hangye')
      setSelectedGroup('')
      setSelectedGroupParams(industryGroupParams)
      return
    }

    if (key === 'industry-diagram') {
      setActiveMenu('industry-diagram')
      setSelectedGroup('')
      setSelectedGroupParams(industryGroupParams)
      return
    }

    if (key === 'tag-management') {
      setActiveMenu('tag-management')
      return
    }

    if (key.startsWith('portfolio-group-')) {
      const groupName = key.replace('portfolio-group-', '')
      setActiveMenu('group')
      setSelectedGroup(groupName)
      setSelectedGroupParams(portfolioGroupParams)
      return
    }

    if (key.startsWith('industry-group-')) {
      const groupName = key.replace('industry-group-', '')
      setActiveMenu('hangye')
      setSelectedGroup(groupName)
      setSelectedGroupParams(industryGroupParams)
    }
  }

  return (
    <Layout style={{ height: '100dvh', overflow: 'hidden' }}>
      <DashboardHeader />

      <Layout style={{ flex: 1, minHeight: 0 }}>
        <Sider
          width={208}
          theme="light"
          style={{
            borderRight: '1px solid #f0f0f0',
            height: '100%',
            minHeight: 0,
            overflow: 'auto',
          }}
        >
          <DashboardMenu
            activeMenu={activeMenu}
            selectedGroup={selectedGroup}
            selectedGroupParams={selectedGroupParams}
            onMenuClick={handleMenuClick}
          />
        </Sider>

        <Layout style={{ flex: 1, minHeight: 0, padding: '14px', overflow: 'hidden' }}>
          <Content
            style={{
              background: '#fff',
              padding: 16,
              borderRadius: '10px',
              boxShadow: '0 1px 2px rgba(0,0,0,0.03)',
              display: 'flex',
              flexDirection: 'column',
              flex: 1,
              minHeight: 0,
              overflow: 'hidden',
            }}
          >
            {activeMenu === 'home' && <HomeView />}
            {activeMenu === 'portfolio' && <PortfolioPage groupParams={portfolioGroupParams} />}
            {activeMenu === 'tag-management' && <PortfolioTagManagementPage />}
            {activeMenu === 'industry-diagram' && <IndustryDiagramPage />}
            {activeMenu === 'strategy' && <StrategyPage />}
            {activeMenu === 'group' && (
              <PortfolioPage
                key={`portfolio-${selectedGroup}`}
                groupName={selectedGroup}
                groupParams={portfolioGroupParams}
              />
            )}
            {activeMenu === 'hangye' && (
              <PortfolioPage
                key={`industry-${selectedGroup}`}
                groupName={selectedGroup}
                groupParams={industryGroupParams}
              />
            )}
          </Content>
        </Layout>
      </Layout>
    </Layout>
  )
}

export default App
