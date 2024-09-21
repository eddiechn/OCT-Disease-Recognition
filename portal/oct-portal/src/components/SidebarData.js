import React from 'react';
import * as AiIcons from 'react-icons/ai';
import * as FaIcons from 'react-icons/fa';
import * as IoIcons from 'react-icons/io';


export const SidebarData = [
    {
        title: 'Home',
        path: "/home",
        icons: <AiIcons.AiFillHome />,
        cName : 'nav-text',
    }, 
    {
        title: 'Results',
        path: "/results",
        icons: <FaIcons.FaChartBar />,
        cName : 'nav-text',
    }, 
    {
        title: 'Stats',
        path: "/stats",
        icons: <IoIcons.IoIosSettings />,
        cName : 'nav-text',
    }
];