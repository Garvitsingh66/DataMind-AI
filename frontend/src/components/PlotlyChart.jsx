import React, { useEffect, useRef } from 'react';
import Plotly from 'plotly.js-dist-min';

export default function PlotlyChart({ data, layout, config, theme }) {
  const chartRef = useRef(null);

  useEffect(() => {
    if (!chartRef.current || !data || data.length === 0) return;

    const isDark = theme === 'dark';
    
    // Deep clone layout to prevent mutation side-effects
    const themedLayout = JSON.parse(JSON.stringify(layout || {}));
    
    themedLayout.paper_bgcolor = 'rgba(0,0,0,0)';
    themedLayout.plot_bgcolor = 'rgba(0,0,0,0)';
    
    themedLayout.font = {
      family: 'Inter, system-ui, -apple-system, sans-serif',
      color: isDark ? '#E2E8F0' : '#0F172A',
      size: 11
    };

    if (themedLayout.title) {
      if (typeof themedLayout.title === 'string') {
        themedLayout.title = {
          text: themedLayout.title,
          font: {
            family: 'Outfit, Inter, sans-serif',
            color: isDark ? '#FFFFFF' : '#0F172A',
            size: 15,
            weight: 'bold'
          }
        };
      } else {
        themedLayout.title.font = {
          family: 'Outfit, Inter, sans-serif',
          color: isDark ? '#FFFFFF' : '#0F172A',
          size: 15,
          weight: 'bold'
        };
      }
    }

    // Standard styling for axes
    const styleAxis = (axis) => {
      if (!axis) return {};
      return {
        ...axis,
        gridcolor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(15, 23, 42, 0.08)',
        tickcolor: isDark ? 'rgba(255, 255, 255, 0.2)' : 'rgba(15, 23, 42, 0.2)',
        linecolor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(15, 23, 42, 0.1)',
        zerolinecolor: isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(15, 23, 42, 0.12)',
        title: axis.title ? {
          ...axis.title,
          font: {
            color: isDark ? '#94A3B8' : '#475569',
            size: 11
          }
        } : undefined
      };
    };

    if (themedLayout.xaxis) themedLayout.xaxis = styleAxis(themedLayout.xaxis);
    if (themedLayout.yaxis) themedLayout.yaxis = styleAxis(themedLayout.yaxis);

    // Apply color scale updates to dark mode if no specific colors are set
    const processedData = data.map(trace => {
      const traceCopy = { ...trace };
      if (traceCopy.type === 'pie') {
        // Soft gradient colors for pie slices
        traceCopy.marker = {
          colors: ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']
        };
      }
      return traceCopy;
    });

    const defaultConfig = {
      responsive: true,
      displayModeBar: true,
      displaylogo: false,
      modeBarButtonsToRemove: ['select2d', 'lasso2d', 'zoomIn2d', 'zoomOut2d', 'autoScale2d'],
      ...config
    };

    Plotly.newPlot(chartRef.current, processedData, themedLayout, defaultConfig);

    // Handle window resize trigger
    const handleResize = () => {
      if (chartRef.current) {
        Plotly.Plots.resize(chartRef.current);
      }
    };
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (chartRef.current) {
        Plotly.purge(chartRef.current);
      }
    };
  }, [data, layout, theme]);

  return <div ref={chartRef} className="w-full h-full min-h-[350px]" />;
}
