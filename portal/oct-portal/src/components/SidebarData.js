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
        title: 'Settings',
        path: "/settings",
        icons: <IoIcons.IoIosSettings />,
        cName : 'nav-text',
    }
];