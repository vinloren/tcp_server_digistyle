USE [homebox]
GO

/****** Object:  Table [dbo].[alive]    Script Date: 07/09/2015 10:18:17 ******/
SET ANSI_NULLS ON
GO

SET QUOTED_IDENTIFIER ON
GO

CREATE TABLE [dbo].[alive](
	[seqId] [int] IDENTITY(1,1) NOT NULL,
	[boxId] [int] NOT NULL,
	[rtc] [datetime] NOT NULL,
	[tipal] [tinyint] NOT NULL,
	[aas] [tinyint] NOT NULL,
	[pwfth] [tinyint] NOT NULL,
	[fail_datetime] [datetime] NOT NULL,
	[durata] [int] NOT NULL,
	[tipsens] [tinyint] NOT NULL,
	[sensSn] [int] NOT NULL,
	[carbatt] [tinyint] NOT NULL,
	[datetest] [datetime] NOT NULL,
	[datecomm] [datetime] NOT NULL,
	[codalarm] [tinyint] NULL,
	[datealarm] [datetime] NULL,
	[alsensSn] [int] NULL
) ON [PRIMARY]

GO


